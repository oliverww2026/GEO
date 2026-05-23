import OpenAI from 'openai';
import { AnalysisRequest, AnalysisResult, MarketingWord } from '../types';
import { MarketingWordService } from './marketingWordService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 将 AI 可能返回的中文带emoji格式转换为标准枚举值
 */
function parseFriendlinessLevel(level: string): 'strong' | 'medium' | 'weak' {
  if (!level) return 'medium';
  if (level.includes('强') || level === 'strong') return 'strong';
  if (level.includes('弱') || level === 'weak') return 'weak';
  return 'medium';
}

/**
 * AI 驱动的分析服务
 * 基于 geo-commercial-prompt-v2.3.md 调用 LLM 进行实时分析
 */
export class AiAnalysisService {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;
  private marketingWordService: MarketingWordService;

  constructor(apiKey?: string, baseURL?: string, model?: string) {
    const finalApiKey = apiKey || process.env.AI_API_KEY;
    const finalBaseURL = baseURL || process.env.AI_BASE_URL || 'https://zenmux.ai/api/v1';
    this.model = model || process.env.AI_MODEL || 'deepseek/deepseek-v4-pro';

    if (!finalApiKey) {
      throw new Error('AI_API_KEY 未设置，请配置企业 API Key 或设置环境变量');
    }

    this.client = new OpenAI({
      apiKey: finalApiKey,
      baseURL: finalBaseURL,
      timeout: 300000, // 300秒超时（5分钟），匹配前端等待时间，API实际响应约220秒
      maxRetries: 1,   // 只重试1次（总共最多2次调用），避免用户等太久
    });

    // 加载 system prompt
    const promptPath = path.join(__dirname, '../../../prompt/geo-commercial-prompt-v2.3.md');
    this.systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    this.marketingWordService = new MarketingWordService();
  }

  /**
   * 执行 AI 分析
   */
  public async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const { brandConfig, content, channels } = request;
    const wordCount = content.length;

    // 1. 营销词检测（用规则引擎，快速准确）
    const marketingWords = this.marketingWordService.detectMarketingWords(content);
    const marketingRiskScore = this.marketingWordService.calculateMarketingRiskScore(marketingWords);
    const marketingWordReport = this.marketingWordService.generateMarketingWordReport(marketingWords);

    // 2. 构造用户消息
    const userMessage = this.buildUserMessage(brandConfig, content, channels, marketingWordReport, marketingRiskScore);

    // 3. 调用 AI API 获取分析结果
    const aiResponse = await this.callAI(userMessage);

    // 4. 解析 AI 返回的 JSON 并与规则引擎数据合并
    const result = this.parseAndMerge(aiResponse, {
      wordCount,
      marketingWords,
      marketingRiskScore,
      marketingWordReport,
    });

    return result;
  }

  /**
   * 构造用户消息
   */
  private buildUserMessage(
    brandConfig: AnalysisRequest['brandConfig'],
    content: string,
    channels: string[],
    marketingWordReport: string,
    marketingRiskScore: number
  ): string {
    // 限制内容长度以避免 token 超限（最多 5000 字）
    const truncatedContent = content.length > 5000
      ? content.substring(0, 5000) + '\n\n[内容过长，已截断至前5000字]'
      : content;

    return `请分析以下营销内容：

**品牌信息**：
- 品牌名称：${brandConfig.brandName}
- 品牌定位：${brandConfig.brandPosition}
- 服务城市：${brandConfig.serviceCity}

    **投放渠道**：${channels && channels.length > 0 ? channels.join('、') : '渠道未确定'}

**待分析内容**：
"""
${truncatedContent}
"""

**营销词检测结果**（已自动完成）：
${marketingWordReport}

请严格按照系统 prompt 中的输出结构（第7节），以 JSON 格式返回完整的分析报告。返回的 JSON 必须包含以下字段：

{
  "overallScore": number (0-100),
  "friendlinessLevel": string ("🟢 强" | "🟡 中" | "🔴 弱"),
  "wordCount": number,
  "dimensionScores": {
    "authority": number (0-100),
    "contentType": number (0-100),
    "dataRichness": number (0-100),
    "brandAnchor": number (0-100),
    "length": number (0-100),
    "marketingRisk": number (0-100, 已由规则引擎计算)
  },
  "modelScores": [
    {
      "modelName": "豆包（字节跳动）",
      "score": number (0-100),
      "level": "strong" | "medium" | "weak",
      "reason": "原因说明",
      "keyIssues": ["问题1", "问题2"]
    },
    ...其他6个模型
  ],
  "rewriteSuggestions": [
    {
      "position": "第X段",
      "originalText": "原文内容",
      "suggestedText": "改后内容",
      "reason": "修改原因"
    }
  ],
  "dataTraceSuggestions": [
    {
      "existingData": "金价XX元/克",
      "currentExpression": "当前表述",
      "suggestedSource": "建议补充来源（如上海黄金交易所官网）"
    }
  ],
  "structureEnhancement": "可直接插入文章的结构化模块文本（markdown），如无需优化则为空字符串",
  "faqSuggestions": [
    {
      "question": "黄金回收需要手续费吗？",
      "answer": "建议答案内容"
    }
  ],
  "competitorComparison": [
    {
      "dimension": "数据详实度",
      "currentStatus": "本文仅有2个数据点",
      "industryBaseline": "行业优质内容通常有5-8个数据点并标注来源",
      "gap": "差距明显"
    }
  ],
  "channelAnalysis": [
    {
      "channel": "渠道名",
      "advantages": ["优势"],
      "disadvantages": ["劣势"],
      "suitableModels": ["适合的模型"]
    }
  ],
  "riskWarning": "风险评估文本",
  "oneSentenceSummary": "一句话总结"
}

重要：
1. 营销语气风险(dimensionScores.marketingRisk) 直接用规则引擎计算的值：${marketingRiskScore}
2. dimensionScores 不能全都是相同分数，需要根据内容合理分配
3. 只返回纯 JSON，不要加任何 markdown 代码块标记`;
  }

  /**
   * 调用 AI API
   */
  private async callAI(userMessage: string): Promise<string> {
    const startTime = Date.now();
    console.log(`[AI] 开始调用 AI API (${this.model})...`);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 8192,
      });

      const elapsed = Date.now() - startTime;
      const usage = response.usage;
      console.log(`[AI] API 调用完成, 耗时 ${elapsed}ms, tokens: prompt=${usage?.prompt_tokens}, completion=${usage?.completion_tokens}, total=${usage?.total_tokens}`);

      const content = response.choices[0]?.message?.content || '';

      // 诊断日志：检查 AI 返回的 optimizationDetails 是否完整
      const finishReason = response.choices[0]?.finish_reason;
      console.log(`[AI] finish_reason: ${finishReason}, content length: ${content.length}`);
      if (finishReason === 'length') {
        console.warn('[AI] ⚠️ 输出被截断！finish_reason=length，增加 max_tokens 或减少输入内容');
      }

      return content;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI] API 调用失败 (${elapsed}ms):`, error);
      throw new Error(`AI 分析服务调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 解析 AI 返回的 JSON 并与规则引擎数据合并
   */
  private parseAndMerge(
    aiResponse: string,
    engineData: {
      wordCount: number;
      marketingWords: MarketingWord[];
      marketingRiskScore: number;
      marketingWordReport: string;
    }
  ): AnalysisResult {
    let parsed: any;

    try {
      // 清洗 AI 返回内容：移除可能的 markdown 代码块标记
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[AI] JSON 解析失败，原始返回:', aiResponse.substring(0, 500));
      // 降级：使用规则引擎默认值
      return this.buildFallbackResult(engineData);
    }

    // 诊断：检查 optimizationDetails 各字段是否为空
    const od = parsed.optimizationDetails || parsed;
    console.log(`[AI] optimizationDetails 完整性: rewriteSuggestions=${Array.isArray(od?.rewriteSuggestions) ? od.rewriteSuggestions.length : 'N/A'}, dataTraceSuggestions=${Array.isArray(od?.dataTraceSuggestions) ? od.dataTraceSuggestions.length : 'N/A'}, structureEnhancement=${od?.structureEnhancement ? '有内容(' + od.structureEnhancement.length + '字)' : '空'}, faqSuggestions=${Array.isArray(od?.faqSuggestions) ? od.faqSuggestions.length : 'N/A'}, competitorComparison=${Array.isArray(od?.competitorComparison) ? od.competitorComparison.length : 'N/A'}`);

    // 合并：使用规则引擎的营销风险评分和营销词数据
    const result: AnalysisResult = {
      overallScore: parsed.overallScore || 50,
      friendlinessLevel: parseFriendlinessLevel(parsed.friendlinessLevel),
      wordCount: engineData.wordCount,
      dimensionScores: {
        authority: parsed.dimensionScores?.authority ?? 50,
        contentType: parsed.dimensionScores?.contentType ?? 50,
        dataRichness: parsed.dimensionScores?.dataRichness ?? 50,
        brandAnchor: parsed.dimensionScores?.brandAnchor ?? 50,
        length: parsed.dimensionScores?.length ?? 50,
        marketingRisk: engineData.marketingRiskScore, // 使用规则引擎值
      },
      modelScores: Array.isArray(parsed.modelScores) ? parsed.modelScores.map((m: any) => ({
        modelName: m.modelName || '未知模型',
        score: m.score || 50,
        level: m.level || 'medium',
        reason: m.reason || '',
        keyIssues: Array.isArray(m.keyIssues) ? m.keyIssues : [],
      })) : [],
      marketingWords: engineData.marketingWords,
      optimizationDetails: (() => {
        // 兼容两种格式：嵌套的 optimizationDetails 对象，或扁平化的根级字段
        const od = parsed.optimizationDetails || parsed;
        return {
          rewriteSuggestions: Array.isArray(od?.rewriteSuggestions)
            ? od.rewriteSuggestions.map((r: any) => ({
                position: r.position || '',
                originalText: r.originalText || '',
                suggestedText: r.suggestedText || '',
                reason: r.reason || '',
              }))
            : [],
          dataTraceSuggestions: Array.isArray(od?.dataTraceSuggestions)
            ? od.dataTraceSuggestions.map((d: any) => ({
                existingData: d.existingData || '',
                currentExpression: d.currentExpression || '',
                suggestedSource: d.suggestedSource || '',
              }))
            : [],
          structureEnhancement: od?.structureEnhancement || '',
          faqSuggestions: Array.isArray(od?.faqSuggestions)
            ? od.faqSuggestions.map((f: any) => ({
                question: f.question || '',
                answer: f.answer || '',
              }))
            : [],
          competitorComparison: Array.isArray(od?.competitorComparison)
            ? od.competitorComparison.map((c: any) => ({
                dimension: c.dimension || '',
                currentStatus: c.currentStatus || '',
                industryBaseline: c.industryBaseline || '',
                gap: c.gap || '',
              }))
            : [],
        };
      })(),
      channelAnalysis: Array.isArray(parsed.channelAnalysis) ? parsed.channelAnalysis.map((c: any) => ({
        channel: c.channel || '',
        advantages: Array.isArray(c.advantages) ? c.advantages : [],
        disadvantages: Array.isArray(c.disadvantages) ? c.disadvantages : [],
        suitableModels: Array.isArray(c.suitableModels) ? c.suitableModels : [],
      })) : [],
      riskWarning: parsed.riskWarning || '',
      oneSentenceSummary: parsed.oneSentenceSummary || '',
    };

    return result;
  }

  /**
   * 构建降级结果（AI 调用失败时使用）
   */
  private buildFallbackResult(engineData: {
    wordCount: number;
    marketingWords: MarketingWord[];
    marketingRiskScore: number;
  }): AnalysisResult {
    return {
      overallScore: 50,
      friendlinessLevel: 'medium',
      wordCount: engineData.wordCount,
      dimensionScores: {
        authority: 50,
        contentType: 50,
        dataRichness: 50,
        brandAnchor: 50,
        length: 50,
        marketingRisk: engineData.marketingRiskScore,
      },
      modelScores: [
        { modelName: '豆包（字节跳动）', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
        { modelName: '通义千问/QWen', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
        { modelName: '腾讯元宝', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
        { modelName: 'Kimi', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
        { modelName: '智谱清言/GLM', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
        { modelName: '海螺AI/MiniMax', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
        { modelName: 'DeepSeek', score: 50, level: 'medium', reason: 'AI 分析降级，使用默认评分', keyIssues: [] },
      ],
      marketingWords: engineData.marketingWords,
      optimizationDetails: {
        rewriteSuggestions: [],
        dataTraceSuggestions: [],
        structureEnhancement: '',
        faqSuggestions: [],
        competitorComparison: [],
      },
      channelAnalysis: [],
      riskWarning: 'AI 分析服务暂时不可用，当前使用降级默认评分。请稍后重试。',
      oneSentenceSummary: 'AI 分析服务暂时不可用',
    };
  }
}