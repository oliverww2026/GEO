import { AnalysisRequest, AnalysisResult, ChannelAnalysis, DimensionScores } from '../types';
import { MarketingWordService } from './marketingWordService';
import { ScoringService } from './scoringService';
import { ModelAnalysisService } from './modelAnalysisService';

/**
 * 内容分析服务（主服务）
 * 协调各个子服务，生成完整的分析报告
 */
export class AnalysisService {
  private marketingWordService: MarketingWordService;
  private scoringService: ScoringService;
  private modelAnalysisService: ModelAnalysisService;

  constructor() {
    this.marketingWordService = new MarketingWordService();
    this.scoringService = new ScoringService();
    this.modelAnalysisService = new ModelAnalysisService();
  }

  /**
   * 执行完整的内容分析
   */
  public async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const { brandConfig, content, channels } = request;

    // 1. 统计字数
    const wordCount = content.length;

    // 2. 检测营销词
    const marketingWords = this.marketingWordService.detectMarketingWords(content);
    const marketingRiskScore = this.marketingWordService.calculateMarketingRiskScore(marketingWords);

    // 3. 计算各维度评分
    const dimensions: DimensionScores = {
      authority: this.scoringService.calculateAuthorityScore(channels),
      contentType: this.scoringService.calculateContentTypeScore(content),
      dataRichness: this.scoringService.calculateDataRichnessScore(content),
      brandAnchor: this.scoringService.calculateBrandAnchorScore(content, brandConfig),
      length: this.scoringService.calculateLengthScore(wordCount),
      marketingRisk: marketingRiskScore
    };

    // 4. 计算综合评分
    const overallScore = this.scoringService.calculateOverallScore(dimensions);
    const friendlinessLevel = this.scoringService.determineFriendlinessLevel(overallScore);

    // 5. 分析各模型召回友好度
    const modelScores = this.modelAnalysisService.analyzeAllModels(dimensions, channels, wordCount);

    // 6. 生成优化建议
    const suggestions = this.generateSuggestions(dimensions, modelScores, wordCount, marketingWords.length);

    // 7. 生成立即行动清单
    const actionList = this.generateActionList(overallScore, dimensions, modelScores);

    // 8. 生成渠道分析
    const channelAnalysis = this.generateChannelAnalysis(channels);

    // 9. 生成一句话结论
    const oneSentenceSummary = this.generateOneSentenceSummary(overallScore, dimensions, modelScores);

    // 10. 生成风险声明
    const riskWarning = this.generateRiskWarning(channels);

    return {
      overallScore,
      friendlinessLevel,
      wordCount,
      dimensionScores: dimensions,
      modelScores,
      marketingWords,
      optimizationDetails: {
        rewriteSuggestions: [],
        dataTraceSuggestions: [],
        structureEnhancement: '',
        faqSuggestions: [],
        competitorComparison: [],
      },
      channelAnalysis,
      riskWarning,
      oneSentenceSummary
    };
  }

  /**
   * 生成优化建议（已废弃，现在使用 AI 生成）
   */
  private generateSuggestions(
    dimensions: DimensionScores,
    modelScores: any[],
    wordCount: number,
    marketingWordCount: number
  ): any[] {
    const suggestions: any[] = [];

    // 营销语气风险建议
    if (dimensions.marketingRisk < 70) {
      suggestions.push({
        title: '降低营销语气',
        content: `当前检测到${marketingWordCount}个营销敏感词，建议替换为客观描述。例如："行业领先"改为"成立X年，服务X万客户"`,
        priority: 'high',
        affectedModels: ['通义千问/QWen', 'DeepSeek'],
        expectedImprovement: '营销语气风险评分可提升至80+，显著提高千问和DeepSeek召回率'
      });
    }

    // 数据丰富度建议
    if (dimensions.dataRichness < 70) {
      suggestions.push({
        title: '补充具体数据和来源',
        content: '建议添加：行业数据（如"2024年黄金回收市场规模达XX亿"）、价格数据、时效数据等，并标注来源',
        priority: 'high',
        affectedModels: ['通义千问/QWen', '智谱清言/GLM', 'DeepSeek'],
        expectedImprovement: '数据丰富度可提升至75+，增强多个模型的召回友好度'
      });
    }

    // 内容类型建议
    if (dimensions.contentType < 75) {
      suggestions.push({
        title: '增加结构化内容',
        content: '建议添加：对比表格（不同回收方式对比）、FAQ（常见问题解答）、流程图（回收流程说明）',
        priority: 'high',
        affectedModels: ['豆包（字节跳动）', '通义千问/QWen', '智谱清言/GLM'],
        expectedImprovement: '内容类型匹配度可提升至80+，大幅提升结构化内容偏好模型的召回率'
      });
    }

    // 篇幅建议
    if (wordCount < 1500) {
      suggestions.push({
        title: '扩充内容篇幅',
        content: `当前${wordCount}字，建议扩充至2000字以上。可增加：行业背景、详细流程、案例分析、注意事项等`,
        priority: 'high',
        affectedModels: ['Kimi', '海螺AI/MiniMax', '腾讯元宝'],
        expectedImprovement: '篇幅达标后，Kimi等长文偏好模型召回率显著提升'
      });
    } else if (wordCount < 2500) {
      suggestions.push({
        title: '继续扩充至3000字+',
        content: '当前篇幅基本达标，如能扩充至3000字以上，将完美匹配Kimi等深度内容偏好模型',
        priority: 'medium',
        affectedModels: ['Kimi'],
        expectedImprovement: 'Kimi召回友好度可达"强"级别'
      });
    }

    // 品牌锚点建议
    if (dimensions.brandAnchor < 70) {
      suggestions.push({
        title: '优化品牌植入方式',
        content: '建议采用事实化植入，如"XX品牌成立于2010年，在北京、上海等地设有门店"，避免"XX品牌是最好的选择"等评价性表达',
        priority: 'medium',
        affectedModels: ['DeepSeek'],
        expectedImprovement: '品牌锚点强度提升至70+，增强DeepSeek召回友好度'
      });
    }

    // 信源权威性建议
    if (dimensions.authority < 65) {
      suggestions.push({
        title: '选择更高权威性渠道',
        content: '建议优先选择：主流财经媒体（如36氪、虎嗅）、垂直行业媒体、知乎等平台，避免仅在品牌自有渠道发布',
        priority: 'medium',
        affectedModels: ['豆包（字节跳动）', '腾讯元宝'],
        expectedImprovement: '信源权威性提升至70+，整体召回友好度显著提升'
      });
    }

    return suggestions;
  }

  /**
   * 生成立即行动清单（已废弃，现在使用 AI 生成）
   */
  private generateActionList(
    overallScore: number,
    dimensions: DimensionScores,
    modelScores: any[]
  ): any[] {
    const actions: any[] = [];

    // 如果综合评分过低，建议重写
    if (overallScore < 40) {
      actions.push({
        action: '建议重写本文而非直接投放，当前内容与GEO召回要求差距较大',
        benefitModels: ['所有模型'],
        effect: 'strong'
      });
      return actions;
    }

    // 找出最需要改进的维度
    const dimensionArray = [
      { name: '营销语气', score: dimensions.marketingRisk, key: 'marketingRisk' },
      { name: '数据丰富度', score: dimensions.dataRichness, key: 'dataRichness' },
      { name: '内容类型', score: dimensions.contentType, key: 'contentType' },
      { name: '篇幅', score: dimensions.length, key: 'length' },
      { name: '品牌锚点', score: dimensions.brandAnchor, key: 'brandAnchor' },
      { name: '信源权威性', score: dimensions.authority, key: 'authority' }
    ].sort((a, b) => a.score - b.score);

    // 生成前3个最需要改进的行动项
    let count = 0;
    for (const dim of dimensionArray) {
      if (count >= 3) break;
      if (dim.score < 70) {
        const action = this.getActionForDimension(dim.key, dim.score);
        if (action) {
          actions.push(action);
          count++;
        }
      }
    }

    // 如果没有明显短板，给出优化建议
    if (actions.length === 0) {
      actions.push({
        action: '内容整体质量良好，建议微调：进一步降低营销词、补充1-2个数据来源',
        benefitModels: ['通义千问/QWen', 'DeepSeek', '智谱清言/GLM'],
        effect: 'medium'
      });
    }

    return actions;
  }

  /**
   * 根据维度生成具体行动（已废弃）
   */
  private getActionForDimension(dimension: string, score: number): any | null {
    const actionMap: { [key: string]: any } = {
      marketingRisk: {
        action: '立即删除或替换所有强营销词（如"领先"、"首选"等），改用客观数据描述',
        benefitModels: ['通义千问/QWen', 'DeepSeek'],
        effect: 'strong'
      },
      dataRichness: {
        action: '补充3-5个具体数据（价格、时间、数量等）并标注来源',
        benefitModels: ['通义千问/QWen', '智谱清言/GLM', 'DeepSeek'],
        effect: 'strong'
      },
      contentType: {
        action: '添加对比表格或FAQ模块，增强内容结构化程度',
        benefitModels: ['豆包（字节跳动）', '通义千问/QWen'],
        effect: 'strong'
      },
      length: {
        action: '扩充内容至2000字以上，增加行业背景、详细流程等深度内容',
        benefitModels: ['Kimi', '海螺AI/MiniMax', '腾讯元宝'],
        effect: 'strong'
      },
      brandAnchor: {
        action: '将品牌提及改为事实化表达，如"XX成立于X年，服务X万客户"',
        benefitModels: ['DeepSeek'],
        effect: 'medium'
      },
      authority: {
        action: '选择更高权威性的发布渠道，如主流财经媒体或垂直行业平台',
        benefitModels: ['豆包（字节跳动）', '腾讯元宝'],
        effect: 'medium'
      }
    };

    return actionMap[dimension] || null;
  }

  /**
   * 生成渠道分析
   */
  private generateChannelAnalysis(channels: string[]): ChannelAnalysis[] {
    if (channels.length === 0) {
      return [{
        channel: '渠道未定',
        advantages: ['可根据内容特点灵活选择'],
        disadvantages: ['信源权威性按基线50分评估'],
        suitableModels: []
      }];
    }

    return channels.map(channel => {
      const analysis: ChannelAnalysis = {
        channel,
        advantages: [],
        disadvantages: [],
        suitableModels: []
      };

      // 根据渠道特点分析
      if (channel.includes('微信公众号') || channel.includes('公众号')) {
        analysis.advantages.push('腾讯元宝强依赖公众号生态', '适合深度长文');
        analysis.suitableModels.push('腾讯元宝');
      }

      if (channel.includes('今日头条') || channel.includes('抖音')) {
        analysis.advantages.push('豆包优先抓取字节系内容', '流量大、传播快');
        analysis.suitableModels.push('豆包（字节跳动）');
      }

      if (channel.includes('知乎')) {
        analysis.advantages.push('适合深度专业内容', 'Kimi和MiniMax偏好知乎长文');
        analysis.suitableModels.push('Kimi', '海螺AI/MiniMax');
      }

      if (channel.includes('36氪') || channel.includes('虎嗅') || channel.includes('钛媒体')) {
        analysis.advantages.push('权威性高（80+分）', '适合所有模型');
        analysis.suitableModels.push('所有模型');
      }

      if (channel.includes('官网') || channel.includes('企业') || channel.includes('品牌')) {
        analysis.disadvantages.push('权威性较低（< 30分）', '召回概率显著降低');
      }

      return analysis;
    });
  }

  /**
   * 生成一句话结论
   */
  private generateOneSentenceSummary(
    overallScore: number,
    dimensions: DimensionScores,
    modelScores: any[]
  ): string {
    const strongModels = modelScores.filter(m => m.level === 'strong').length;
    const weakModels = modelScores.filter(m => m.level === 'weak').length;

    if (overallScore >= 75) {
      return `内容质量优秀（${overallScore}分），${strongModels}个模型召回友好度达"强"级别，建议直接投放`;
    } else if (overallScore >= 55) {
      return `内容质量中等（${overallScore}分），有${weakModels}个模型召回友好度较弱，建议优化后投放`;
    } else {
      return `内容质量偏低（${overallScore}分），多数模型召回友好度不足，建议重点优化或重写`;
    }
  }

  /**
   * 生成风险声明
   */
  private generateRiskWarning(channels: string[]): string {
    let warning = '本次分析存在以下不确定性，实际效果以探针验证为准：\n\n';
    
    if (channels.length === 0) {
      warning += '1. 渠道未定，信源权威性以"新文章基线50分"评估\n';
    } else {
      warning += '1. 渠道权威性评分基于行业观察，非实测数据\n';
    }
    
    warning += '2. 各模型引用率基于生态逻辑与行业观察，非实测数据\n';
    warning += '3. 营销词扣分机制基于行业经验建模，具体扣分幅度需验证\n';
    warning += '4. 建议发布后1个月、3个月、6个月进行探针验证（在目标模型中搜索相关问题，观察是否召回本文）';

    return warning;
  }
}
