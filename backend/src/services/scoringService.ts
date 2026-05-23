import { DimensionScores, BrandConfig } from '../types';

/**
 * 评分服务
 * 实现6个维度的评分逻辑
 */
export class ScoringService {
  
  /**
   * 计算信源权威性评分（维度1，权重30%）
   * 根据投放渠道判断权威性
   */
  public calculateAuthorityScore(channels: string[]): number {
    if (channels.length === 0) {
      return 50; // 渠道未知，按基线50分处理
    }

    // 渠道权威性映射
    const channelScores: { [key: string]: number } = {
      '新华社': 98,
      '人民日报': 98,
      '央视': 97,
      'CCTV': 97,
      '中国政府网': 96,
      '财新': 92,
      '第一财经': 90,
      '澎湃新闻': 88,
      '界面新闻': 87,
      '36氪': 85,
      '虎嗅': 85,
      '钛媒体': 84,
      '新浪财经': 83,
      '腾讯财经': 83,
      '新浪': 75,
      '腾讯': 75,
      '网易': 74,
      '搜狐': 73,
      '今日头条': 72,
      '百度': 70,
      '知乎': 68,
      '小红书': 66,
      '微信公众号': 58,
      '抖音': 55,
      '快手': 54,
      '视频号': 53,
      'B站': 52,
      '个人博客': 40,
      '论坛': 38,
      '贴吧': 35,
      '官网': 20,
      '企业公众号': 15,
      '品牌自媒体': 10
    };

    // 取最高分渠道
    let maxScore = 50; // 默认基线
    for (const channel of channels) {
      for (const [key, score] of Object.entries(channelScores)) {
        if (channel.includes(key)) {
          maxScore = Math.max(maxScore, score);
        }
      }
    }

    return maxScore;
  }

  /**
   * 计算内容类型匹配度评分（维度2，权重25%）
   */
  public calculateContentTypeScore(content: string): number {
    let score = 0;
    const indicators = {
      hasTable: /[|│]\s*[\u4e00-\u9fa5]+\s*[|│]/.test(content),
      hasFAQ: /(问|Q|FAQ|常见问题)[:：]/.test(content),
      hasComparison: /(对比|比较|vs|VS)/.test(content),
      hasAnalysis: /(分析|研究|报告|调研)/.test(content),
      hasSubtitles: (content.match(/^#{1,3}\s+/gm) || []).length >= 3,
      hasProcess: /(流程|步骤|方法|如何)/.test(content),
      hasDecisionGuide: /(选择|决策|建议|指南)/.test(content),
      hasExplanation: /(什么是|介绍|了解|知识)/.test(content),
      hasPromotion: /(优惠|折扣|活动|限时|抢购)/.test(content),
      hasBrandPush: /(我们|本公司|我司|欢迎咨询)/.test(content)
    };

    if (indicators.hasTable && indicators.hasFAQ) {
      score = 95;
    } else if (indicators.hasTable || indicators.hasAnalysis) {
      score = 90;
    } else if (indicators.hasComparison && indicators.hasAnalysis) {
      score = 92;
    } else if (indicators.hasSubtitles && indicators.hasProcess) {
      score = 82;
    } else if (indicators.hasSubtitles || indicators.hasDecisionGuide) {
      score = 78;
    } else if (indicators.hasExplanation) {
      score = 65;
    } else {
      score = 50;
    }

    if (indicators.hasPromotion) {
      score -= 20;
    }
    if (indicators.hasBrandPush) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算数据丰富度评分（维度3，权重15%）
   */
  public calculateDataRichnessScore(content: string): number {
    const dataPatterns = [
      /\d+\.?\d*%/g,
      /\d+\.?\d*元/g,
      /\d+\.?\d*克/g,
      /\d+\.?\d*[万亿千百]/g,
      /\d{4}年/g,
      /\d+\.?\d*倍/g,
    ];

    let dataCount = 0;
    const foundData = new Set<string>();
    
    for (const pattern of dataPatterns) {
      const matches = content.match(pattern) || [];
      matches.forEach(m => foundData.add(m));
    }
    dataCount = foundData.size;

    const sourcePatterns = [
      /(根据|据|来源|数据来源|引自)[:：]/g,
      /（来源[:：][^）]+）/g,
      /\[来源[:：][^\]]+\]/g,
    ];

    let sourceCount = 0;
    for (const pattern of sourcePatterns) {
      const matches = content.match(pattern) || [];
      sourceCount += matches.length;
    }

    const sourceRatio = dataCount > 0 ? sourceCount / dataCount : 0;

    if (dataCount >= 10 && sourceRatio >= 0.8) {
      return 95;
    } else if (dataCount >= 5 && sourceRatio >= 0.5) {
      return 82;
    } else if (dataCount >= 3) {
      return sourceRatio > 0 ? 70 : 65;
    } else if (dataCount >= 1) {
      return 50;
    } else {
      return 20;
    }
  }

  /**
   * 计算品牌锚点强度评分（维度4，权重10%）
   */
  public calculateBrandAnchorScore(content: string, brandConfig: BrandConfig): number {
    const brandName = brandConfig.brandName;
    
    if (!brandName) {
      return 0;
    }

    const brandMatches: number[] = [];
    let index = 0;
    while ((index = content.indexOf(brandName, index)) !== -1) {
      brandMatches.push(index);
      index += brandName.length;
    }

    if (brandMatches.length === 0) {
      return 0;
    }

    const evaluativePatterns = [
      new RegExp(`${brandName}(是|为|作为).{0,10}(最好|最优|首选|领先|专业)`, 'g'),
      new RegExp(`(选择|推荐|信赖)${brandName}`, 'g'),
    ];

    let isFactual = true;
    for (const pattern of evaluativePatterns) {
      if (pattern.test(content)) {
        isFactual = false;
        break;
      }
    }

    const contentLength = content.length;
    const positions = brandMatches.map(pos => pos / contentLength);
    const isMultiPosition = positions.some(p => p < 0.3) && positions.some(p => p > 0.7);

    if (isFactual && brandMatches.length >= 2 && isMultiPosition) {
      return 95;
    } else if (isFactual && brandMatches.length >= 1) {
      return 80;
    } else if (!isFactual && brandMatches.length >= 1) {
      return 60;
    } else if (brandMatches.length === 1 && positions[0] > 0.8) {
      return 40;
    } else {
      return 50;
    }
  }

  /**
   * 计算篇幅匹配度评分（维度5，权重10%）
   */
  public calculateLengthScore(wordCount: number): number {
    if (wordCount >= 3000) {
      return 98;
    } else if (wordCount >= 2000) {
      return 87;
    } else if (wordCount >= 1500) {
      return 72;
    } else if (wordCount >= 1000) {
      return 52;
    } else if (wordCount >= 600) {
      return 30;
    } else {
      return 10;
    }
  }

  /**
   * 计算综合评分
   */
  public calculateOverallScore(dimensions: DimensionScores): number {
    const score = 
      0.30 * dimensions.authority +
      0.25 * dimensions.contentType +
      0.15 * dimensions.dataRichness +
      0.10 * dimensions.brandAnchor +
      0.10 * dimensions.length +
      0.10 * dimensions.marketingRisk;
    
    return Math.round(score * 10) / 10;
  }

  /**
   * 判断召回友好度等级 (返回英文字符串以匹配前端)
   */
  public determineFriendlinessLevel(overallScore: number): string {
    if (overallScore >= 75) {
      return 'strong';
    } else if (overallScore >= 55) {
      return 'medium';
    } else {
      return 'weak';
    }
  }
}