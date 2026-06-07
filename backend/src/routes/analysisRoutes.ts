import { Router, Request, Response } from 'express';
import { AiAnalysisService } from '../services/aiAnalysisService';
import { AnalysisRequest } from '../types';
import { requireAuth } from '../auth/authMiddleware';
import { getEnterpriseByUserId } from '../auth/authService';
import { getDatabase } from '../database/init';
import { checkQuota, consumeQuota } from '../services/quotaService';

const router = Router();
let analysisService: AiAnalysisService | null = null;
let currentApiConfig: { apiKey: string; baseUrl: string; model: string } | null = null;

/**
 * 获取分析服务实例，使用企业配置的 API Key
 */
function getAnalysisService(apiKey?: string, baseUrl?: string, model?: string): AiAnalysisService {
  // 如果提供了企业级 Key，创建新实例
  if (apiKey) {
    currentApiConfig = { apiKey, baseUrl: baseUrl || '', model: model || '' };
    analysisService = new AiAnalysisService(apiKey, baseUrl, model);
    return analysisService;
  }
  // fallback
  if (!analysisService) {
    analysisService = new AiAnalysisService();
  }
  return analysisService;
}

/**
 * 将 marketingWords 数组转换为前端期望的分组格式
 */
function transformMarketingWords(marketingWords: any[]): any {
  const result = {
    strong: [] as Array<{ word: string; count: number }>,
    medium: [] as Array<{ word: string; count: number }>,
    weak: [] as Array<{ word: string; count: number }>,
    totalPenalty: 0
  };

  // 使用 Map 合并同一词汇的多次检测结果
  const wordMap = new Map<string, { word: string; count: number; penalty: number; category: string }>();

  for (const mw of marketingWords) {
    const existing = wordMap.get(mw.word);
    if (existing) {
      existing.count += mw.count;
      existing.penalty += mw.penalty;
    } else {
      wordMap.set(mw.word, {
        word: mw.word,
        count: mw.count,
        penalty: mw.penalty,
        category: mw.category
      });
    }
  }

  for (const [, item] of wordMap) {
    if (item.category === 'strong') {
      result.strong.push({ word: item.word, count: item.count });
    } else if (item.category === 'medium') {
      result.medium.push({ word: item.word, count: item.count });
    } else {
      result.weak.push({ word: item.word, count: item.count });
    }
    result.totalPenalty += item.penalty;
  }

  return result;
}

/**
 * POST /api/analysis
 * 分析内容并返回完整报告（需要登录）
 */
router.post('/analysis', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const user = req.currentUser!;
    const request: AnalysisRequest = req.body;

    // 验证请求参数
    if (!request.brandConfig || !request.content) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供 brandConfig 和 content'
      });
    }

    if (!request.brandConfig.brandName) {
      return res.status(400).json({
        error: '缺少品牌名称',
        message: '请提供品牌名称'
      });
    }

    if (request.content.trim().length < 10) {
      return res.status(400).json({
        error: '内容过短',
        message: '内容至少需要10个字符'
      });
    }

    // ── 配额检查 ──
    const quota = checkQuota(user.userId);
    if (!quota.allowed) {
      return res.status(402).json({
        error: '次数不足',
        message: `今日免费次数已用完（${quota.usedToday}/${quota.limitToday}），请购买套餐继续使用`,
        quota,
        requirePayment: true,
      });
    }

    // 获取用户企业的 API Key
    const enterprise = getEnterpriseByUserId(user.userId);
    if (!enterprise || !enterprise.apiKey) {
      return res.status(400).json({
        error: '企业未配置',
        message: '您的企业尚未配置 AI API Key，请联系管理员'
      });
    }

    // 使用企业配置的 Key 创建分析服务实例
    const service = getAnalysisService(
      enterprise.apiKey,
      enterprise.apiBaseUrl || undefined,
      enterprise.apiModel || undefined
    );

    // 执行分析
    const result = await service.analyze(request);

    const durationMs = Date.now() - startTime;

    // 转换数据格式以匹配前端期望
    const transformedResult = {
      ...result,
      marketingWords: transformMarketingWords(result.marketingWords)
    };

    // 消耗一次配额
    consumeQuota(user.userId);

    // 记录完整分析日志（输入内容 + 分析结果 JSON）
    const db = getDatabase();
    db.prepare(`
      INSERT INTO analysis_logs (user_id, enterprise_id, input_content, content_length, channels, duration_ms, success, result_json, overall_score)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      user.userId,
      enterprise.id,
      request.content,
      request.content.length,
      request.channels?.join(',') || '',
      durationMs,
      JSON.stringify(result),
      result.overallScore
    );

    // 返回结果（含最新配额信息）
    const updatedQuota = checkQuota(user.userId);
    res.json({
      success: true,
      data: transformedResult,
      quota: updatedQuota,
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;

    // 记录失败日志（含错误信息和输入内容）
    try {
      const user = req.currentUser;
      if (user) {
        const db = getDatabase();
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        db.prepare(`
          INSERT INTO analysis_logs (user_id, enterprise_id, input_content, content_length, channels, duration_ms, success, error_message)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
          user.userId,
          user.enterpriseId,
          req.body?.content || '',
          req.body?.content?.length || 0,
          req.body?.channels?.join(',') || '',
          durationMs,
          errorMsg
        );
      }
    } catch { /* ignore */ }

    console.error('分析失败:', error);
    res.status(500).json({
      error: '分析失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * POST /api/analysis/public
 * 免登录分析内容——使用环境变量中的 AI API Key（用于跳过登录页直接使用）
 */
router.post('/analysis/public', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const request: AnalysisRequest = req.body;

    // 验证请求参数
    if (!request.brandConfig || !request.content) {
      return res.status(400).json({
        error: '缺少必要参数',
        message: '请提供 brandConfig 和 content'
      });
    }

    if (!request.brandConfig.brandName) {
      return res.status(400).json({
        error: '缺少品牌名称',
        message: '请提供品牌名称'
      });
    }

    if (request.content.trim().length < 10) {
      return res.status(400).json({
        error: '内容过短',
        message: '内容至少需要10个字符'
      });
    }

    // 使用环境变量中的 API Key
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;

    if (!apiKey) {
      return res.status(400).json({
        error: 'AI 配置缺失',
        message: '服务器未配置 AI_API_KEY 环境变量'
      });
    }

    const service = getAnalysisService(apiKey, baseUrl, model);
    const result = await service.analyze(request);

    const durationMs = Date.now() - startTime;

    const transformedResult = {
      ...result,
      marketingWords: transformMarketingWords(result.marketingWords)
    };

    // 记录公开分析日志（user_id=0 表示免登录/匿名用户）
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO analysis_logs (user_id, enterprise_id, input_content, content_length, channels, duration_ms, success, result_json, overall_score)
        VALUES (0, 0, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        request.content,
        request.content.length,
        request.channels?.join(',') || '',
        durationMs,
        JSON.stringify(result),
        result.overallScore
      );
    } catch (logErr) {
      console.warn('记录公开分析日志失败:', logErr);
    }

    res.json({
      success: true,
      data: transformedResult
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;

    // 记录公开分析失败日志
    try {
      const db = getDatabase();
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      db.prepare(`
        INSERT INTO analysis_logs (user_id, enterprise_id, input_content, content_length, channels, duration_ms, success, error_message)
        VALUES (0, 0, ?, ?, ?, ?, 0, ?)
      `).run(
        req.body?.content || '',
        req.body?.content?.length || 0,
        req.body?.channels?.join(',') || '',
        durationMs,
        errorMsg
      );
    } catch { /* ignore */ }

    console.error('公开分析失败:', error);
    res.status(500).json({
      error: '分析失败',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * GET /api/admin/logs
 * 查询分析记录列表（管理员）
 */
router.get('/admin/logs', requireAuth, (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    // 管理员可查看同企业所有记录
    if (user.role !== 'admin') {
      // 普通员工只能看自己的
      const db = getDatabase();
      const rows = db.prepare(`
        SELECT id, user_id, enterprise_id, content_length, channels, duration_ms, success, overall_score, error_message, created_at
        FROM analysis_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100
      `).all(user.userId);
      return res.json({ success: true, data: rows });
    }

    const db = getDatabase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // 管理员可查看：本企业记录 + 公开分析记录（enterprise_id=0）
    const rows = db.prepare(`
      SELECT al.id, al.user_id, al.enterprise_id, u.username, u.display_name,
             al.content_length, al.channels, al.duration_ms, al.success, al.overall_score, al.error_message, al.created_at
      FROM analysis_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.enterprise_id = ? OR (al.enterprise_id = 0 AND al.user_id = 0)
      ORDER BY al.created_at DESC LIMIT ? OFFSET ?
    `).all(user.enterpriseId, limit, offset);

    const total = db.prepare(
      "SELECT COUNT(*) as cnt FROM analysis_logs WHERE enterprise_id = ? OR (enterprise_id = 0 AND user_id = 0)"
    ).get(user.enterpriseId) as { cnt: number };

    res.json({ success: true, data: { rows, total: total.cnt, page, limit } });
  } catch (error) {
    console.error('获取分析记录失败:', error);
    res.status(500).json({ error: '服务器错误', message: '获取分析记录失败' });
  }
});

/**
 * GET /api/admin/logs/:id
 * 查询单条分析记录详情（含完整输入内容和结果）
 */
router.get('/admin/logs/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const recordId = parseInt(req.params.id);
    const user = req.currentUser!;

    const row = db.prepare(`
      SELECT al.*, u.username, u.display_name
      FROM analysis_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ? AND (al.enterprise_id = ? OR (al.enterprise_id = 0 AND al.user_id = 0))
    `).get(recordId, user.enterpriseId) as any;

    if (!row) {
      return res.status(404).json({ error: '记录不存在', message: '未找到该分析记录' });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error('获取分析记录详情失败:', error);
    res.status(500).json({ error: '服务器错误', message: '获取分析记录详情失败' });
  }
});

/**
 * GET /api/health
 * 健康检查（无需登录）
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GEO Backend API'
  });
});

export default router;