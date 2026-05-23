# GEO智测工具 - 后端服务

基于 Node.js + Express + TypeScript 的内容分析后端服务。

## 功能特性

- ✅ 完整实现 GEO 商业化 Prompt v2.3 逻辑
- ✅ 6 维度评分系统（信源权威性、内容类型、数据丰富度、品牌锚点、篇幅、营销语气风险）
- ✅ 7 个 AI 模型召回友好度分析（豆包、千问、元宝、Kimi、GLM、MiniMax、DeepSeek）
- ✅ 营销敏感词检测（强/中/弱三级分类）
- ✅ 智能优化建议生成
- ✅ 立即行动清单
- ✅ 渠道分析

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express 4.x
- **语言**: TypeScript 5.x
- **依赖管理**: npm

## 项目结构

```
backend/
├── src/
│   ├── index.ts                 # 主入口文件
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   ├── services/
│   │   ├── analysisService.ts  # 主分析服务（协调器）
│   │   ├── scoringService.ts   # 评分服务（6维度）
│   │   ├── modelAnalysisService.ts  # 模型分析服务
│   │   └── marketingWordService.ts  # 营销词检测服务
│   └── routes/
│       └── analysisRoutes.ts   # API 路由
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件（可选，使用默认值即可）：

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务将在 `http://localhost:3001` 启动。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API 文档

### 健康检查

```http
GET /api/health
```

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T08:00:00.000Z",
  "service": "GEO Backend API"
}
```

### 内容分析

```http
POST /api/analysis
Content-Type: application/json
```

**请求体**:
```json
{
  "brandConfig": {
    "brandName": "久久金",
    "brandPosition": "高价回收",
    "serviceCity": "全国"
  },
  "content": "这里是要分析的内容文本...",
  "channels": ["知乎", "微信公众号"]
}
```

**响应示例**:
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
    "modelScores": [...],
    "marketingWords": [...],
    "suggestions": [...],
    "actionList": [...],
    "channelAnalysis": [...],
    "riskWarning": "...",
    "oneSentenceSummary": "..."
  }
}
```

## 核心逻辑说明

### 评分公式

```
综合评分 = 30% × 信源权威性 
         + 25% × 内容类型匹配度 
         + 15% × 数据丰富度 
         + 10% × 品牌锚点强度 
         + 10% × 篇幅匹配度 
         + 10% × 营销语气风险
```

### 营销词扣分规则

- **强营销词**: 每次扣 15 分（如：领先、唯一、第一）
- **中营销词**: 每次扣 8 分（如：专业、值得信赖）
- **弱营销词**: 每次扣 3 分（如：优质、高端）

### 模型召回友好度判定

每个模型有独特的偏好和硬门槛：

- **豆包**: 偏好今日头条/抖音渠道 + FAQ/表格
- **千问**: 强制要求营销语气风险 ≥ 60 分
- **元宝**: 强制要求微信公众号渠道
- **Kimi**: 强制要求篇幅 ≥ 1500 字
- **GLM**: 偏好数据丰富 + 逻辑严密
- **MiniMax**: 要求篇幅 ≥ 1000 字
- **DeepSeek**: 强制要求营销语气风险 ≥ 60 分 + 事实化品牌植入

## 开发说明

### 添加新的营销词

编辑 `../data/marketing_wordlib.json`，在对应分类中添加词汇：

```json
{
  "terms": {
    "strong": ["新词1", "新词2"],
    "medium": [...],
    "weak": [...]
  }
}
```

### 调整评分权重

修改 `src/services/scoringService.ts` 中的 `calculateOverallScore` 方法。

### 添加新模型

在 `src/services/modelAnalysisService.ts` 中添加新的分析方法。

## 测试

```bash
# 健康检查
curl http://localhost:3001/api/health

# 内容分析测试
curl -X POST http://localhost:3001/api/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "brandConfig": {
      "brandName": "测试品牌",
      "brandPosition": "高价回收",
      "serviceCity": "北京"
    },
    "content": "这是一段测试内容，用于验证分析功能是否正常工作。",
    "channels": ["知乎"]
  }'
```

## 注意事项

1. 营销词库路径硬编码为 `../data/marketing_wordlib.json`，确保文件存在
2. 建议内容长度至少 100 字，否则分析结果可能不准确
3. 渠道名称需要包含关键词（如"知乎"、"微信公众号"等）才能正确识别

## License

MIT
