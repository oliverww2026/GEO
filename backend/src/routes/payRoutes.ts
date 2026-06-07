import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { requireAuth } from '../auth/authMiddleware';
import { getDatabase } from '../database/init';
import { PLAN_PRICE, PLAN_NAME, checkQuota } from '../services/quotaService';

const router = Router();

/**
 * 生成唯一订单号
 */
function genOutTradeNo(userId: number): string {
  return `GEO_${userId}_${Date.now()}`;
}

/**
 * 虎皮椒支付签名
 * hash = md5(appid + notify_url + return_url + time + title + total_fee + trade_order_id + appsecret)
 */
function hupiSign(params: {
  appid: string;
  notify_url: string;
  return_url: string;
  time: number;
  title: string;
  total_fee: number;
  trade_order_id: string;
  appsecret: string;
}): string {
  const str = params.appid + params.notify_url + params.return_url +
    params.time + params.title + params.total_fee +
    params.trade_order_id + params.appsecret;
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * GET /api/user/quota
 * 查询当前用户今日剩余次数和套餐状态
 */
router.get('/user/quota', requireAuth, (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    const quota = checkQuota(user.userId);
    res.json({ success: true, data: quota });
  } catch (error) {
    console.error('查询配额失败:', error);
    res.status(500).json({ error: '服务器错误', message: '查询配额失败' });
  }
});

/**
 * GET /api/user/orders
 * 查询当前用户历史订单
 */
router.get('/user/orders', requireAuth, (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, plan_type, amount, status, expire_at, created_at
      FROM orders WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(user.userId);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ error: '服务器错误', message: '查询订单失败' });
  }
});

/**
 * POST /api/pay/create
 * 创建支付订单，返回虎皮椒支付跳转 URL
 */
router.post('/pay/create', requireAuth, (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    const { planType } = req.body;

    if (!['single', 'monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ error: '无效套餐', message: '请选择有效的套餐类型' });
    }

    const appid = process.env.HUPI_APPID;
    const appsecret = process.env.HUPI_APPSECRET;

    if (!appid || !appsecret) {
      return res.status(500).json({ error: '支付未配置', message: '服务器尚未配置支付参数，请联系管理员' });
    }

    const amount = PLAN_PRICE[planType];
    const title = `逗你玩AI · ${PLAN_NAME[planType]}`;
    const outTradeNo = genOutTradeNo(user.userId);
    const time = Math.floor(Date.now() / 1000);
    const baseUrl = process.env.APP_BASE_URL || 'https://geo-backend.onrender.com';
    const notifyUrl = `${baseUrl}/api/pay/notify`;
    const returnUrl = `${baseUrl}/pay/success?plan=${planType}`;

    const hash = hupiSign({
      appid, appsecret,
      notify_url: notifyUrl,
      return_url: returnUrl,
      time, title,
      total_fee: amount,
      trade_order_id: outTradeNo,
    });

    // 先在数据库创建 pending 订单
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO orders (user_id, plan_type, amount, status, out_trade_no)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(user.userId, planType, amount, outTradeNo);

    // 构造虎皮椒支付 URL
    const payUrl = `https://api.hupi.io/payment/submit?` + new URLSearchParams({
      version: '1.1',
      appid,
      trade_order_id: outTradeNo,
      total_fee: String(amount),
      title,
      time: String(time),
      notify_url: notifyUrl,
      return_url: returnUrl,
      hash,
    }).toString();

    console.log(`[Pay] 创建订单: ${outTradeNo}, 用户: ${user.userId}, 套餐: ${planType}, 金额: ${amount}分`);

    res.json({
      success: true,
      data: {
        orderId: result.lastInsertRowid,
        outTradeNo,
        payUrl,
        amount,
        planType,
        title,
      }
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ error: '服务器错误', message: '创建订单失败' });
  }
});

/**
 * POST /api/pay/notify
 * 虎皮椒支付回调（异步通知）
 */
router.post('/pay/notify', (req: Request, res: Response) => {
  try {
    const { trade_order_id, trade_no, total_fee, status, hash } = req.body;

    const appid = process.env.HUPI_APPID;
    const appsecret = process.env.HUPI_APPSECRET;

    if (!appid || !appsecret) {
      return res.status(500).send('fail');
    }

    // 验证签名：md5(appid + trade_order_id + trade_no + total_fee + status + appsecret)
    const expectedHash = crypto.createHash('md5')
      .update(appid + trade_order_id + trade_no + total_fee + status + appsecret)
      .digest('hex');

    if (hash !== expectedHash) {
      console.warn(`[Pay] 回调签名验证失败: ${trade_order_id}`);
      return res.status(400).send('fail');
    }

    if (status !== 'OD') {
      // 非支付成功状态，忽略
      return res.send('success');
    }

    const db = getDatabase();
    const order = db.prepare(`SELECT * FROM orders WHERE out_trade_no = ?`).get(trade_order_id) as any;

    if (!order) {
      console.warn(`[Pay] 回调订单不存在: ${trade_order_id}`);
      return res.send('success');
    }

    if (order.status === 'paid') {
      // 已处理过，幂等返回
      return res.send('success');
    }

    // 计算到期时间
    let expireAt: string | null = null;
    const now = new Date();
    if (order.plan_type === 'monthly') {
      const exp = new Date(now);
      exp.setMonth(exp.getMonth() + 1);
      expireAt = exp.toISOString().slice(0, 10);
    } else if (order.plan_type === 'yearly') {
      const exp = new Date(now);
      exp.setFullYear(exp.getFullYear() + 1);
      expireAt = exp.toISOString().slice(0, 10);
    }
    // single 无到期时间

    db.prepare(`
      UPDATE orders SET status = 'paid', trade_no = ?, expire_at = ?, updated_at = datetime('now')
      WHERE out_trade_no = ?
    `).run(trade_no, expireAt, trade_order_id);

    console.log(`[Pay] ✅ 支付成功: ${trade_order_id}, 用户: ${order.user_id}, 套餐: ${order.plan_type}`);
    res.send('success');
  } catch (error) {
    console.error('[Pay] 回调处理失败:', error);
    res.status(500).send('fail');
  }
});

/**
 * GET /api/pay/query/:outTradeNo
 * 前端轮询支付状态
 */
router.get('/pay/query/:outTradeNo', requireAuth, (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    const db = getDatabase();
    const order = db.prepare(`
      SELECT id, plan_type, amount, status, expire_at, created_at
      FROM orders WHERE out_trade_no = ? AND user_id = ?
    `).get(req.params.outTradeNo, user.userId) as any;

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ error: '服务器错误', message: '查询订单状态失败' });
  }
});

export default router;
