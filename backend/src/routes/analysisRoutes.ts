import { Router, Request, Response } from 'express';
import { AiAnalysisService } from '../services/aiAnalysisService';
import { AnalysisRequest } from '../types';
import { requireAuth } from '../auth/authMiddleware';
import { getEnterpriseByUserId } from '../auth/authService';
import { getDatabase } from '../database/init';

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

    // 记录分析日志
    const db = getDatabase();
    db.prepare(`
      INSERT INTO analysis_logs (user_id, enterprise_id, content_length, channels, duration_ms, success)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(
      user.userId,
      enterprise.id,
      request.content.length,
      request.channels?.join(',') || '',
      durationMs
    );

    // 返回结果
    res.json({
      success: true,
      data: transformedResult
    });

  } catch (error) {
    const durationMs = Date.now() - startTime;

    // 记录失败日志
    try {
      const user = req.currentUser;
      if (user) {
        const db = getDatabase();
        db.prepare(`
          INSERT INTO analysis_logs (user_id, enterprise_id, content_length, channels, duration_ms, success)
          VALUES (?, ?, ?, ?, ?, 0)
        `).run(
          user.userId,
          user.enterpriseId,
          req.body?.content?.length || 0,
          req.body?.channels?.join(',') || '',
          durationMs
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