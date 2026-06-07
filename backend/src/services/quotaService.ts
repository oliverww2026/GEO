import { getDatabase } from '../database/init';

/**
 * 套餐配置：每天可用次数
 */
export const PLAN_DAILY_LIMIT: Record<string, number> = {
  free: 1,       // 免费用户每天 1 次
  monthly: 10,   // 阅读会员每天 10 次
  yearly: 9999,  // 年度会员不限
};

/**
 * 套餐价格（分）
 */
export const PLAN_PRICE: Record<string, number> = {
  monthly: 14900,  // ¥149
  yearly: 149900,  // ¥1499
};

/**
 * 套餐名称
 */
export const PLAN_NAME: Record<string, string> = {
  monthly: '阅读会员',
  yearly: '年度会员',
};

/**
 * 获取今天的日期字符串 YYYY-MM-DD（UTC+8）
 */
function getTodayStr(): string {
  const now = new Date();
  // 转为北京时间
  const bjTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return bjTime.toISOString().slice(0, 10);
}

/**
 * 获取用户当前有效套餐
 * 优先级：yearly > monthly > single > free
 */
export function getUserActivePlan(userId: number): {
  planType: string;
  expireAt: string | null;
  orderId: number | null;
} {
  const db = getDatabase();
  const today = getTodayStr();

  // 查找有效的付费订单（按优先级排序）
  const order = db.prepare(`
    SELECT id, plan_type, expire_at FROM orders
    WHERE user_id = ?
      AND status = 'paid'
      AND (expire_at IS NULL OR expire_at >= ?)
    ORDER BY
      CASE plan_type
        WHEN 'yearly' THEN 1
        WHEN 'monthly' THEN 2
        WHEN 'single' THEN 3
        ELSE 4
      END ASC
    LIMIT 1
  `).get(userId, today) as any;

  if (order) {
    return { planType: order.plan_type, expireAt: order.expire_at, orderId: order.id };
  }

  return { planType: 'free', expireAt: null, orderId: null };
}

/**
 * 检查用户今天是否还有可用次数
 */
export function checkQuota(userId: number): {
  allowed: boolean;
  planType: string;
  usedToday: number;
  limitToday: number;
  remaining: number;
} {
  const db = getDatabase();
  const today = getTodayStr();
  const { planType } = getUserActivePlan(userId);

  // 单次购买：检查是否有未使用的 single 订单
  if (planType === 'single') {
    const singleOrder = db.prepare(`
      SELECT id FROM orders
      WHERE user_id = ? AND plan_type = 'single' AND status = 'paid'
      LIMIT 1
    `).get(userId) as any;

    if (!singleOrder) {
      return { allowed: false, planType, usedToday: 0, limitToday: 0, remaining: 0 };
    }
    return { allowed: true, planType, usedToday: 0, limitToday: 1, remaining: 1 };
  }

  const limit = PLAN_DAILY_LIMIT[planType] || 1;

  // 查今天已用次数
  const usage = db.prepare(`
    SELECT count FROM daily_usage WHERE user_id = ? AND date = ?
  `).get(userId, today) as any;

  const usedToday = usage?.count || 0;
  const remaining = Math.max(0, limit - usedToday);

  return {
    allowed: usedToday < limit,
    planType,
    usedToday,
    limitToday: limit,
    remaining,
  };
}

/**
 * 消耗一次使用次数
 */
export function consumeQuota(userId: number): void {
  const db = getDatabase();
  const today = getTodayStr();
  const { planType, orderId } = getUserActivePlan(userId);

  // 单次购买：将该订单标记为已使用（expired）
  if (planType === 'single' && orderId) {
    db.prepare(`UPDATE orders SET status = 'used', updated_at = datetime('now') WHERE id = ?`).run(orderId);
    return;
  }

  // 其他套餐：累加每日使用次数
  db.prepare(`
    INSERT INTO daily_usage (user_id, date, count)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1
  `).run(userId, today);
}
