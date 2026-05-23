// 品牌配置
export interface BrandConfig {
  brandName: string;        // 品牌名称
  brandPosition: string;    // 品牌定位
  serviceCity: string;      // 服务城市
}

// 内容输入
export interface ContentInput {
  text: string;             // 内容文本
  channels: string[];       // 投放渠道
}

// 维度评分
export interface DimensionScores {
  authority: number;        // 信源权威性 (0-100)
  contentType: number;      // 内容类型匹配度 (0-100)
  dataRichness: number;     // 数据丰富度 (0-100)
  brandAnchor: number;      // 品牌锚点强度 (0-100)
  length: number;           // 篇幅匹配度 (0-100)
  marketingRisk: number;    // 营销语气风险 (0-100)
}

// 模型评分
export interface ModelScore {
  modelName: string;        // 模型名称
  score: number;            // 评分
  level: 'strong' | 'medium' | 'weak';  // 友好度等级
  reason: string;           // 原因说明
  keyIssues: string[];      // 关键问题
}

// 营销词命中
export interface MarketingWord {
  word: string;             // 词汇
  category: 'strong' | 'medium' | 'weak';  // 分类
  count: number;            // 出现次数
  positions: number[];      // 出现位置（字符索引）
  penalty: number;          // 扣分
}

// 改写条目
export interface RewriteItem {
  position: string;         // 位置
  originalText: string;     // 原文
  suggestedText: string;    // 改后内容
  reason: string;           // 修改原因
}

// 数据溯源条目
export interface DataTraceItem {
  existingData: string;     // 现有数据
  currentExpression: string; // 当前表述
  suggestedSource: string;  // 建议补充来源
}

// 结构化增强建议
export interface StructureEnhancement {
  suggestion: string;       // 建议内容（markdown 文本块）
}

// FAQ 条目
export interface FAQItem {
  question: string;         // 问题
  answer: string;           // 答案
}

// 竞品对比条目
export interface CompetitorComparisonItem {
  dimension: string;        // 对比维度
  currentStatus: string;    // 本文现状
  industryBaseline: string; // 行业优质内容基线
  gap: string;              // 差距
}

// 优化建议详情（所有子项）
export interface OptimizationDetails {
  rewriteSuggestions: RewriteItem[];          // 具体改写方案
  dataTraceSuggestions: DataTraceItem[];       // 数据溯源补充方案
  structureEnhancement: string;                // 结构化增强建议（markdown）
  faqSuggestions: FAQItem[];                   // 高频问答FAQ
  competitorComparison: CompetitorComparisonItem[]; // 竞品内容对比参考
}

// 渠道分析
export interface ChannelAnalysis {
  channel: string;          // 渠道名称
  advantages: string[];     // 优势
  disadvantages: string[];  // 劣势
  suitableModels: string[]; // 适合的模型
}

// 分析结果
export interface AnalysisResult {
  overallScore: number;           // 综合评分 (0-100)
  friendlinessLevel: string;      // 召回友好度 (强/中/弱)
  wordCount: number;              // 字数统计
  dimensionScores: DimensionScores;  // 各维度评分
  modelScores: ModelScore[];      // 各模型评分
  marketingWords: MarketingWord[]; // 营销词命中
  optimizationDetails: OptimizationDetails; // 优化建议详情（5个子项）
  channelAnalysis: ChannelAnalysis[]; // 渠道分析
  riskWarning: string;            // 风险声明
  oneSentenceSummary: string;     // 一句话结论
}

// 分析请求
export interface AnalysisRequest {
  brandConfig: BrandConfig;
  content: string;
  channels: string[];
}

// 营销词库结构
export interface MarketingWordLib {
  metadata: {
    description: string;
    version: string;
    lastUpdated: string;
    changelog: string;
    sourceSummary: string;
  };
  terms: {
    strong: string[];
    medium: string[];
    weak: string[];
  };
}

// 渠道权威性映射
export interface ChannelAuthority {
  [key: string]: {
    score: number;
    tier: string;
  };
}
