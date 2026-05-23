# GEO 后端实现文档

## 概述

本文档详细说明了 GEO 智测工具后端服务的实现细节，包括架构设计、核心算法、API 接口等。

## 技术架构

### 技术栈
- **运行时**: Node.js 18+
- **框架**: Express 4.x
- **语言**: TypeScript 5.x
- **开发工具**: ts-node-dev（热重载）

### 项目结构

```
backend/
├── src/
│   ├── index.ts                    # 服务器入口，Express 配置
│   ├── types/
│   │   └── index.ts               # 全局类型定义
│   ├── services/
│   │   ├── analysisService.ts     # 主分析服务（协调器）
│   │   ├── scoringService.ts      # 评分引擎（6维度）
│   │   ├── modelAnalysisService.ts # 模型分析服务（7个模型）
│   │   └── marketingWordService.ts # 营销词检测服务
│   └── routes/
│       └── analysisRoutes.ts      # API 路由定义
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 核心服务详解

### 1. AnalysisService（主分析服务）

**职责**: 协调所有子服务，生成完整的分析报告

**核心方法**:
- `analyze(request: AnalysisRequest): Promise<AnalysisResult>`

**执行流程**:
1. 统计字数
2. 检测营销词（调用 MarketingWordService）
3. 计算6个维度评分（调用 ScoringService）
4. 计算综合评分
5. 分析各模型召回友好度（调用 ModelAnalysisService）
6. 生成优化建议
7. 生成立即行动清单
8. 生成渠道分析
9. 生成一句话结论和风险声明

### 2. ScoringService（评分引擎）

**职责**: 实现6个维度的评分逻辑

**核心方法**:

#### 2.1 信源权威性评分（权重30%）
```typescript
calculateAuthorityScore(channels: string[]): number
```

**评分规则**:
- 国家级权威机构/媒体: 95-100分
- 头部财经/主流媒体: 80-94分
- 主流门户/垂直媒体: 65-79分
- 机构认证自媒体: 50-64分
- 个人自媒体/一般社区: 30-49分
- 品牌自有渠道: 0-29分
- 渠道未知: 50分（基线）

#### 2.2 内容类型匹配度评分（权重25%）
```typescript
calculateContentTypeScore(content: string): number
```

**评分指标**:
- 结构化深度内容（90-100分）: 表格、FAQ、对比、分析报告
- 半结构化专业内容（75-89分）: 小标题、流程、决策参考
- 普通科普型内容（60-74分）: 科普说明
- 营销内容扣分: 促销词-20分，品牌推广-15分

#### 2.3 数据丰富度评分（权重15%）
```typescript
calculateDataRichnessScore(content: string): number
```

**评分逻辑**:
- 统计具体数据（百分比、金额、重量、年份等）
- 统计来源标注
- 计算来源标注比例
- 10+数据且80%+来源: 95分
- 5-9数据且50%+来源: 82分
- 3-4数据: 65-70分
- 1-2数据: 50分
- 无数据: 20分

#### 2.4 品牌锚点强度评分（权重10%）
```typescript
calculateBrandAnchorScore(content: string, brandConfig: BrandConfig): number
```

**评分规则**:
- 事实化植入 + 多位置自然出现: 95分
- 事实化植入 + 单次出现: 80分
- 评价化植入: 60分
- 仅段尾/结尾提及: 40分
- 未出现品牌名: 0分

#### 2.5 篇幅匹配度评分（权重10%）
```typescript
calculateLengthScore(wordCount: number): number
```

**评分标准**:
- 3000字以上: 98分
- 2000-2999字: 87分
- 1500-1999字: 72分
- 1000-1499字: 52分
- 600-999字: 30分
- 600字以下: 10分

#### 2.6 营销语气风险评分（权重10%）
由 MarketingWordService 计算，从100分开始扣分。

#### 2.7 综合评分计算
```typescript
综合评分 = 30% × 信源权威性 
         + 25% × 内容类型匹配度 
         + 15% × 数据丰富度 
         + 10% × 品牌锚点强度 
         + 10% × 篇幅匹配度 
         + 10% × 营销语气风险
```

### 3. MarketingWordService（营销词检测）

**职责**: 检测内容中的营销敏感词并计算扣分

**核心方法**:
- `detectMarketingWords(content: string): MarketingWord[]`
- `calculateMarketingRiskScore(marketingWords: MarketingWord[]): number`

**扣分规则**:
- 强营销词: 每次扣15分（如：领先、唯一、第一）
- 中营销词: 每次扣8分（如：专业、值得信赖）
- 弱营销词: 每次扣3分（如：优质、高端）

**评分计算**:
```typescript
营销语气风险评分 = max(0, 100 - 总扣分)
```

### 4. ModelAnalysisService（模型分析）

**职责**: 分析7个AI模型的召回友好度

**核心方法**:
- `analyzeAllModels(dimensions, channels, wordCount): ModelScore[]`

**模型分析逻辑**:

#### 4.1 豆包（字节跳动）
- **偏好**: 今日头条/抖音渠道、FAQ/表格
- **硬门槛**: 无今日头条/抖音且信源<65 → 🔴弱
- **强判定**: 信源≥75 且 内容类型≥75 → 🟢强

#### 4.2 通义千问/QWen
- **偏好**: 结构化表格、带来源数据、去营销化
- **硬门槛**: 营销语气风险<60 → 🔴弱
- **强判定**: 营销风险≥80 且 数据≥75 且 内容类型≥80 → 🟢强

#### 4.3 腾讯元宝
- **偏好**: 微信公众号、深度长文
- **硬门槛**: 无公众号渠道 → 🔴弱
- **强判定**: 有公众号 且 篇幅≥80 且 内容类型≥75 → 🟢强

#### 4.4 Kimi
- **偏好**: 知乎长文、3000字+深度内容
- **硬门槛**: 篇幅<1500字 → 🔴弱
- **强判定**: 篇幅≥3000 且 内容类型≥80 → 🟢强

#### 4.5 智谱清言/GLM
- **偏好**: 逻辑严密、可溯源的数据分析
- **硬门槛**: 数据<60 且 内容类型<75 → 🔴弱
- **强判定**: 数据≥80 且 内容类型≥80 → 🟢强

#### 4.6 海螺AI/MiniMax
- **偏好**: 知乎深文、对比/结构化内容
- **硬门槛**: 篇幅<1000字 → 🔴弱
- **强判定**: 篇幅≥2000 且 内容类型≥80 → 🟢强

#### 4.7 DeepSeek
- **偏好**: 权威数据、逻辑链完整、事实化品牌植入
- **硬门槛**: 营销语气风险<60 → 🔴弱
- **强判定**: 数据≥75 且 品牌锚点≥70 且 营销风险≥80 → 🟢强

## API 接口

### POST /api/analysis

**请求体**:
```json
{
  "brandConfig": {
    "brandName": "品牌名称",
    "brandPosition": "品牌定位",
    "serviceCity": "服务城市"
  },
  "content": "待分析的内容文本",
  "channels": ["渠道1", "渠道2"]
}
```

**响应体**:
```json
{
  "success": true,
  "data": {
    "overallScore": 72.5,
    "friendlinessLevel": "🟡 中",
    "wordCount": 1500,
    "dimensionScores": {
      "authority": 68,
      "contentType": 75,
      "dataRichness": 65,
      "brandAnchor": 80,
      "length": 72,
      "marketingRisk": 85
    },
    "modelScores": [
      {
        "modelName": "通义千问/QWen",
        "score": 75.5,
        "level": "medium",
        "reason": "部分维度需要优化",
        "keyIssues": ["数据丰富度不足"]
      }
    ],
    "marketingWords": [
      {
        "word": "专业",
        "category": "weak",
        "count": 2,
        "positions": [120, 450],
        "penalty": 6
      }
    ],
    "suggestions": [...],
    "actionList": [...],
    "channelAnalysis": [...],
    "riskWarning": "...",
    "oneSentenceSummary": "..."
  }
}
```

### GET /api/health

健康检查接口

**响应体**:
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T08:00:00.000Z",
  "service": "GEO Backend API"
}
```

## 数据依赖

### 营销词库
路径: `../data/marketing_wordlib.json`

结构:
```json
{
  "metadata": {...},
  "terms": {
    "strong": ["领先", "唯一", ...],
    "medium": ["专业", "值得信赖", ...],
    "weak": ["优质", "高端", ...]
  }
}
```

## 性能优化

1. **同步处理**: 所有分析逻辑均为同步操作，响应速度快
2. **内存缓存**: 营销词库在服务启动时加载到内存
3. **正则优化**: 使用高效的正则表达式进行文本匹配

## 错误处理

1. **参数验证**: 检查必要参数是否存在
2. **异常捕获**: 所有API都有try-catch保护
3. **友好错误信息**: 返回清晰的错误提示

## 扩展性

### 添加新模型
在 `modelAnalysisService.ts` 中添加新的分析方法：

```typescript
private analyzeNewModel(dimensions: DimensionScores): ModelScore {
  // 实现新模型的分析逻辑
}
```

### 调整评分权重
修改 `scoringService.ts` 中的权重系数。

### 添加新维度
1. 在 `types/index.ts` 中添加新维度字段
2. 在 `scoringService.ts` 中实现评分方法
3. 更新综合评分公式

## 部署建议

### 开发环境
```bash
npm run dev
```

### 生产环境
```bash
npm run build
npm start
```

### 环境变量
```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

## 测试

### 单元测试
建议使用 Jest 进行单元测试：
- 测试各个评分方法的准确性
- 测试营销词检测的准确性
- 测试模型分析逻辑

### 集成测试
使用 curl 或 Postman 测试完整的分析流程。

## 维护指南

### 更新营销词库
编辑 `../data/marketing_wordlib.json`，重启服务生效。

### 调整模型偏好
修改 `modelAnalysisService.ts` 中对应模型的分析方法。

### 优化评分算法
根据实际效果反馈，调整 `scoringService.ts` 中的评分逻辑。

## 已知限制

1. 营销词检测基于简单字符串匹配，可能存在误判
2. 内容类型识别基于关键词和结构特征，准确度有限
3. 数据来源识别依赖特定格式，可能遗漏非标准格式
4. 品牌锚点分析仅检测品牌名出现，不考虑上下文语义

## 未来优化方向

1. 引入NLP技术提升文本分析准确度
2. 支持更多文件格式（PDF、DOCX等）
3. 添加历史记录和对比功能
4. 实现批量分析功能
5. 集成真实的模型召回验证API
