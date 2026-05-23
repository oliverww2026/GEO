import { ModelScore, DimensionScores } from '../types';

/** 四舍五入到一位小数 */
function round(score: number): number {
  return Math.round(score * 10) / 10;
}

/**
 * 模型分析服务
 * 实现各个AI模型的召回友好度评估逻辑
 */
export class ModelAnalysisService {
  
  /**
   * 分析所有模型的召回友好度
   */
  public analyzeAllModels(
    dimensions: DimensionScores,
    channels: string[],
    wordCount: number
  ): ModelScore[] {
    const models: ModelScore[] = [
      this.analyzeDouBao(dimensions, channels),
      this.analyzeQWen(dimensions),
      this.analyzeYuanBao(dimensions, channels),
      this.analyzeKimi(dimensions, wordCount),
      this.analyzeGLM(dimensions),
      this.analyzeMiniMax(dimensions, wordCount),
      this.analyzeDeepSeek(dimensions)
    ];

    // 按友好度排序（弱到强）
    return models.sort((a, b) => {
      const levelOrder = { 'weak': 0, 'medium': 1, 'strong': 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }

  /**
   * 豆包（字节跳动）分析
   */
  private analyzeDouBao(dimensions: DimensionScores, channels: string[]): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    const hasPreferredChannel = channels.some(c => 
      c.includes('今日头条') || c.includes('抖音')
    );

    if (!hasPreferredChannel && dimensions.authority < 65) {
      level = 'weak';
      keyIssues.push('缺少今日头条/抖音渠道且信源权威性不足');
    }

    if (dimensions.contentType < 75) {
      keyIssues.push('内容结构化程度不足，建议增加FAQ或表格');
    }

    if (dimensions.authority >= 75 && dimensions.contentType >= 75) {
      level = 'strong';
    } else if (keyIssues.length === 0) {
      level = 'medium';
    }

    return {
      modelName: '豆包（字节跳动）',
      score: round(dimensions.authority * 0.4 + dimensions.contentType * 0.3 + dimensions.marketingRisk * 0.3),
      level,
      reason: level === 'strong' ? '渠道和内容类型匹配度高' : 
              level === 'medium' ? '基本满足要求，有改进空间' : 
              '渠道或内容类型不匹配',
      keyIssues
    };
  }

  /**
   * 通义千问/QWen 分析
   */
  private analyzeQWen(dimensions: DimensionScores): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    if (dimensions.marketingRisk < 60) {
      level = 'weak';
      keyIssues.push('营销语气过重（< 60分），需大幅降低营销词使用');
    }

    if (dimensions.dataRichness < 70) {
      keyIssues.push('数据丰富度不足，建议补充具体数据和来源');
    }

    if (dimensions.contentType < 75) {
      keyIssues.push('缺少结构化内容（表格、对比等）');
    }

    if (dimensions.marketingRisk >= 80 && dimensions.dataRichness >= 75 && dimensions.contentType >= 80) {
      level = 'strong';
    }

    return {
      modelName: '通义千问/QWen',
      score: round(dimensions.contentType * 0.3 + dimensions.dataRichness * 0.3 + dimensions.marketingRisk * 0.4),
      level,
      reason: level === 'strong' ? '结构化、数据化、去营销化表现优秀' :
              level === 'medium' ? '部分维度需要优化' :
              '营销语气过重，不符合千问偏好',
      keyIssues
    };
  }

  /**
   * 腾讯元宝分析
   */
  private analyzeYuanBao(dimensions: DimensionScores, channels: string[]): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    const hasWechat = channels.some(c => c.includes('微信公众号') || c.includes('公众号'));
    
    if (!hasWechat) {
      level = 'weak';
      keyIssues.push('未在微信公众号发布，元宝强依赖公众号生态');
    }

    if (dimensions.length < 70) {
      keyIssues.push('篇幅偏短，元宝偏好深度长文');
    }

    if (hasWechat && dimensions.length >= 80 && dimensions.contentType >= 75) {
      level = 'strong';
    }

    return {
      modelName: '腾讯元宝',
      score: round(dimensions.authority * 0.4 + dimensions.length * 0.3 + dimensions.contentType * 0.3),
      level,
      reason: level === 'strong' ? '公众号渠道+深度内容，匹配度高' :
              level === 'medium' ? '有公众号渠道但内容深度可提升' :
              '缺少公众号渠道，召回概率极低',
      keyIssues
    };
  }

  /**
   * Kimi 分析
   */
  private analyzeKimi(dimensions: DimensionScores, wordCount: number): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    if (wordCount < 1500) {
      level = 'weak';
      keyIssues.push(`篇幅过短（${wordCount}字），Kimi要求至少1500字`);
    }

    if (dimensions.contentType < 75) {
      keyIssues.push('内容深度不足，建议增加分析和结构化内容');
    }

    if (wordCount >= 3000 && dimensions.contentType >= 80) {
      level = 'strong';
    } else if (wordCount >= 2000 && dimensions.contentType >= 70) {
      level = 'medium';
    }

    return {
      modelName: 'Kimi',
      score: round(dimensions.length * 0.5 + dimensions.contentType * 0.3 + dimensions.dataRichness * 0.2),
      level,
      reason: level === 'strong' ? '长文+深度内容，完美匹配Kimi偏好' :
              level === 'medium' ? '篇幅和深度基本达标，可继续优化' :
              '篇幅严重不足，无法满足Kimi要求',
      keyIssues
    };
  }

  /**
   * 智谱清言/GLM 分析
   */
  private analyzeGLM(dimensions: DimensionScores): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    if (dimensions.dataRichness < 60 && dimensions.contentType < 75) {
      level = 'weak';
      keyIssues.push('数据丰富度和内容类型均不达标');
    }

    if (dimensions.dataRichness < 70) {
      keyIssues.push('数据不足或缺少来源标注');
    }

    if (dimensions.contentType < 75) {
      keyIssues.push('内容逻辑性和结构化程度不足');
    }

    if (dimensions.dataRichness >= 80 && dimensions.contentType >= 80) {
      level = 'strong';
    }

    return {
      modelName: '智谱清言/GLM',
      score: round(dimensions.dataRichness * 0.4 + dimensions.contentType * 0.4 + dimensions.marketingRisk * 0.2),
      level,
      reason: level === 'strong' ? '数据充分、逻辑严密，符合GLM偏好' :
              level === 'medium' ? '数据或逻辑性需要加强' :
              '数据和逻辑性双重不足',
      keyIssues
    };
  }

  /**
   * 海螺AI/MiniMax 分析
   */
  private analyzeMiniMax(dimensions: DimensionScores, wordCount: number): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    if (wordCount < 1000) {
      level = 'weak';
      keyIssues.push(`篇幅不足（${wordCount}字），MiniMax要求至少1000字`);
    }

    if (dimensions.contentType < 70) {
      keyIssues.push('缺少对比或结构化内容');
    }

    if (wordCount >= 2000 && dimensions.contentType >= 80) {
      level = 'strong';
    }

    return {
      modelName: '海螺AI/MiniMax',
      score: round(dimensions.length * 0.4 + dimensions.contentType * 0.4 + dimensions.dataRichness * 0.2),
      level,
      reason: level === 'strong' ? '深度+结构化内容，匹配MiniMax偏好' :
              level === 'medium' ? '基本达标，可优化结构化程度' :
              '篇幅不足，无法满足要求',
      keyIssues
    };
  }

  /**
   * DeepSeek 分析
   */
  private analyzeDeepSeek(dimensions: DimensionScores): ModelScore {
    const keyIssues: string[] = [];
    let level: 'strong' | 'medium' | 'weak' = 'medium';

    if (dimensions.marketingRisk < 60) {
      level = 'weak';
      keyIssues.push('营销语气过重（< 60分），DeepSeek强烈排斥营销内容');
    }

    if (dimensions.dataRichness < 70) {
      keyIssues.push('数据权威性不足');
    }

    if (dimensions.brandAnchor < 70) {
      keyIssues.push('品牌植入方式需优化为事实化表达');
    }

    if (dimensions.dataRichness >= 75 && dimensions.brandAnchor >= 70 && dimensions.marketingRisk >= 80) {
      level = 'strong';
    }

    return {
      modelName: 'DeepSeek',
      score: round(dimensions.dataRichness * 0.3 + dimensions.brandAnchor * 0.3 + dimensions.marketingRisk * 0.4),
      level,
      reason: level === 'strong' ? '数据权威+事实化植入+去营销化，完美匹配' :
              level === 'medium' ? '部分维度需优化' :
              '营销语气过重或品牌植入方式不当',
      keyIssues
    };
  }
}