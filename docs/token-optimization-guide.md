# GEO Skill Token优化指南

## 📊 当前Token使用分析

### 当前Prompt统计
- **总字符数**: ~4,200字符
- **估算Token**: ~2,800 tokens（中文按1.5字符/token计算）
- **问题**: 每次调用都要发送完整prompt，成本较高

---

## 🎯 优化方案（可节省60-80% Token）

### 方案1：分层Prompt架构 ⭐⭐⭐⭐⭐（推荐）

将prompt拆分为3层，按需加载：

#### 第1层：核心系统提示（固定，可缓存）
```markdown
# 角色定义
你是GEO智能检测助手，评估内容对AI模型召回品牌的友好程度。

# 评分公式
综合评分 = 30%信源 + 25%内容类型 + 15%数据 + 10%品牌锚点 + 10%篇幅 + 10%营销风险

# 输出结构
1. 立即行动清单（3条）
2. 一句话结论
3. 核心数据（评分+友好度）
4. 各模型诊断（弱→强排序）
5. 优化建议
6. 风险声明
```
**Token**: ~200 tokens（节省93%）

#### 第2层：评分标准（按需引用）
```markdown
# 评分Rubric（仅在需要时加载）
## 信源权威性
- 95-100: 国家级 | 80-94: 头部财经 | 65-79: 主流门户
- 50-64: 认证自媒体 | 30-49: 个人自媒体 | 0-29: 品牌自有

## 内容类型
- 90-100: 结构化深度 | 75-89: 半结构化 | 60-74: 科普
- 40-59: 轻营销 | 0-39: 纯宣传

## 数据丰富度
- 90-100: 10+数据,80%+来源 | 75-89: 5-9数据,50%+来源
- 60-74: 3-4数据 | 40-59: 1-2数据 | 0-39: 无数据

## 品牌锚点
- 90-100: 事实化多次 | 70-89: 事实化单次 | 50-69: 评价化
- 30-49: 仅结尾 | 0-29: 未出现

## 篇幅
- 95-100: 3000+ | 80-94: 2000-2999 | 65-79: 1500-1999
- 40-64: 1000-1499 | 20-39: 600-999 | 0-19: <600

## 营销风险
强词-15分 | 中词-8分 | 弱词-3分（最低0分）
```
**Token**: ~300 tokens（仅在用户询问评分标准时加载）

#### 第3层：模型规则（动态加载）
```markdown
# 模型偏好（仅分析时加载相关模型）
豆包: 头条/抖音+FAQ+短时效 | 无渠道且信源<65→🔴
千问: 表格+数据来源+去营销 | 营销<60→🔴
元宝: 公众号+长文+短时效 | 无公众号→🔴
Kimi: 知乎+3000字+深度 | <1500字→🔴
GLM: 逻辑+可溯源数据 | 数据<60且类型<75→🔴
MiniMax: 知乎+对比+结构化 | <1000字→🔴
DeepSeek: 权威数据+事实化植入 | 营销<60→🔴
```
**Token**: ~200 tokens（按需加载）

---

### 方案2：使用Function Calling（推荐豆包/千问）

将评分逻辑封装为函数，减少prompt长度：

```json
{
  "name": "analyze_content",
  "description": "分析内容的GEO友好度",
  "parameters": {
    "content": "文章内容",
    "brand": "品牌名",
    "channels": ["渠道列表"],
    "analysis_depth": "simple|detailed"
  }
}
```

**优势**：
- Prompt减少到500 tokens以内
- 结构化输入输出，更稳定
- 支持流式返回，用户体验更好

---

### 方案3：词库外置化 ⭐⭐⭐⭐⭐（必做）

**当前问题**：营销词库在prompt中会占用大量token

**优化方案**：
```typescript
// 后端处理营销词检测，不占用AI token
function detectMarketingWords(content: string) {
  const wordlib = loadWordlib(); // 从本地加载
  const hits = {
    strong: [],
    medium: [],
    weak: []
  };
  
  // 本地匹配，不消耗AI token
  for (const word of wordlib.strong) {
    if (content.includes(word)) {
      hits.strong.push(word);
    }
  }
  
  // 计算扣分
  const score = 100 - (hits.strong.length * 15 + 
                       hits.medium.length * 8 + 
                       hits.weak.length * 3);
  
  return { score, hits };
}

// 只把结果传给AI
const prompt = `
营销词检测结果：
- 强词: ${hits.strong.join(', ')} (${hits.strong.length}个)
- 中词: ${hits.medium.join(', ')} (${hits.medium.length}个)  
- 弱词: ${hits.weak.join(', ')} (${hits.weak.length}个)
- 营销风险评分: ${score}分

请基于此结果进行分析...
`;
```

**节省**: 词库本身约500 tokens → 结果摘要约50 tokens（节省90%）

---

### 方案4：智能摘要输入内容

对于长文章，先提取关键信息：

```typescript
function extractKeyInfo(content: string) {
  return {
    wordCount: content.length,
    hasTable: /\|.*\|/.test(content),
    hasFAQ: /问：|Q:|答：|A:/.test(content),
    dataCount: (content.match(/\d+%|\d+元|\d+年/g) || []).length,
    brandMentions: countBrandMentions(content),
    structure: analyzeStructure(content), // 标题层级
    firstParagraph: content.slice(0, 200), // 开头200字
    lastParagraph: content.slice(-200) // 结尾200字
  };
}

// 只传关键信息给AI，不传全文
const prompt = `
分析以下内容特征：
- 字数: ${info.wordCount}
- 数据点: ${info.dataCount}个
- 品牌提及: ${info.brandMentions}次
- 结构化: ${info.hasTable ? '有表格' : '无表格'}
- 开头: ${info.firstParagraph}
- 结尾: ${info.lastParagraph}
...
`;
```

**节省**: 3000字文章 ~2000 tokens → 摘要 ~300 tokens（节省85%）

---

### 方案5：缓存机制（豆包/OpenAI支持）

利用Prompt Caching功能：

```typescript
const systemPrompt = {
  role: "system",
  content: "核心系统提示...",
  cache_control: { type: "ephemeral" } // 标记为可缓存
};

// 首次调用: 2800 tokens
// 后续调用: 只计算新增内容，系统提示免费
```

**节省**: 第2次起节省90%的系统提示token

---

## 📈 综合优化效果对比

| 方案 | 单次Token | 节省比例 | 实施难度 |
|------|----------|---------|---------|
| 原始方案 | ~2800 | - | - |
| 分层架构 | ~400-800 | 71-86% | ⭐⭐⭐ |
| Function Calling | ~300-500 | 82-89% | ⭐⭐⭐⭐ |
| 词库外置 | ~2300 | 18% | ⭐ |
| 智能摘要 | ~500-1000 | 64-82% | ⭐⭐⭐ |
| Prompt Caching | ~280(首次后) | 90% | ⭐⭐ |
| **组合方案** | **~200-400** | **85-93%** | ⭐⭐⭐ |

---

## 🚀 推荐实施路径

### 阶段1：立即可做（1天）
1. ✅ **词库外置化** - 您已经做了！`data/marketing_wordlib.json`
2. ✅ **本地评分计算** - 您的backend已实现
3. 🔧 **精简prompt** - 移除冗余说明

### 阶段2：核心优化（3天）
1. **分层Prompt架构**
   - 创建3个prompt模板
   - 根据用户请求动态组合
2. **智能摘要**
   - 提取文章关键特征
   - 只传必要信息给AI

### 阶段3：高级优化（1周）
1. **Function Calling**
   - 封装为结构化函数
   - 支持流式输出
2. **Prompt Caching**
   - 启用缓存机制
   - 降低重复调用成本

---

## 💡 Skill封装建议

### 技能配置示例（豆包格式）

```yaml
skill_name: "GEO内容智测"
description: "评估内容对AI模型召回的友好度"
version: "2.3"

# 精简的系统提示
system_prompt: |
  你是GEO智能检测助手。评估内容对7大AI模型的召回友好度。
  
  评分公式: 30%信源+25%内容类型+15%数据+10%品牌+10%篇幅+10%营销
  
  输出: 1)立即行动清单 2)一句话结论 3)评分 4)模型诊断 5)优化建议

# 用户输入模板
user_template: |
  品牌: {{brand}}
  渠道: {{channels}}
  
  文章特征:
  - 字数: {{word_count}}
  - 数据点: {{data_count}}个
  - 品牌提及: {{brand_mentions}}次
  - 营销词: 强{{strong_words}}个/中{{medium_words}}个/弱{{weak_words}}个
  - 营销评分: {{marketing_score}}分
  
  内容摘要:
  {{content_summary}}
  
  请分析召回友好度。

# 参数配置
parameters:
  temperature: 0.3  # 降低随机性
  max_tokens: 1500  # 限制输出长度
  top_p: 0.9
```

### Token成本对比

| 场景 | 原方案 | 优化后 | 节省 |
|------|--------|--------|------|
| 单次分析 | 2800+2000(文章)=4800 | 400+300(摘要)=700 | 85% |
| 10次分析 | 48,000 | 7,000 | 85% |
| 100次分析 | 480,000 | 70,000 | 85% |

**成本节省**（按0.001元/1K tokens计算）：
- 单次: 4.8元 → 0.7元（节省4.1元）
- 100次: 480元 → 70元（节省410元）
- 1000次: 4800元 → 700元（节省4100元）

---

## 🎯 具体实施代码

### 1. 精简Prompt模板

```typescript
// prompt/geo-skill-optimized.ts
export const CORE_PROMPT = `你是GEO智能检测助手，评估内容对AI模型召回品牌的友好度。

评分公式: 30%信源+25%内容类型+15%数据+10%品牌+10%篇幅+10%营销

输出结构:
1. 立即行动清单(3条)
2. 一句话结论  
3. 核心数据(评分+友好度)
4. 各模型诊断(弱→强)
5. 优化建议
6. 风险声明`;

export const RUBRIC_PROMPT = `评分标准:
信源: 95国家级|80头部|65主流|50认证|30个人|0品牌
内容: 90结构化|75半结构|60科普|40轻营销|0纯宣传
数据: 90(10+数据)|75(5-9)|60(3-4)|40(1-2)|0无
品牌: 90事实多次|70事实单次|50评价|30结尾|0未现
篇幅: 95(3000+)|80(2000+)|65(1500+)|40(1000+)|20(600+)|0(<600)
营销: 强词-15|中词-8|弱词-3`;

export const MODEL_RULES = `模型偏好:
豆包:头条/抖音+FAQ|无渠道且信源<65→🔴
千问:表格+来源+去营销|营销<60→🔴
元宝:公众号+长文|无公众号→🔴
Kimi:知乎+3000字|<1500→🔴
GLM:逻辑+溯源|数据<60且类型<75→🔴
MiniMax:知乎+对比|<1000→🔴
DeepSeek:权威+事实化|营销<60→🔴`;
```

### 2. 智能Prompt组装

```typescript
// services/promptService.ts
export class PromptService {
  buildPrompt(request: AnalysisRequest, needsDetail: boolean = false) {
    const parts = [CORE_PROMPT];
    
    // 根据需求动态添加
    if (needsDetail) {
      parts.push(RUBRIC_PROMPT);
    }
    
    if (request.includeModelRules) {
      parts.push(MODEL_RULES);
    }
    
    // 添加分析数据（已预处理）
    parts.push(this.buildAnalysisData(request));
    
    return parts.join('\n\n');
  }
  
  buildAnalysisData(request: AnalysisRequest) {
    const { brand, channels, analysis } = request;
    
    return `品牌: ${brand}
渠道: ${channels.join('、')}

文章特征:
- 字数: ${analysis.wordCount}
- 数据点: ${analysis.dataCount}个
- 品牌提及: ${analysis.brandMentions}次
- 营销词: 强${analysis.marketing.strong.length}个/中${analysis.marketing.medium.length}个/弱${analysis.marketing.weak.length}个
- 营销评分: ${analysis.marketingScore}分
- 结构化: ${analysis.hasTable ? '有表格' : '无表格'}${analysis.hasFAQ ? '/有FAQ' : ''}

内容摘要:
开头: ${analysis.firstParagraph}
结尾: ${analysis.lastParagraph}

请分析召回友好度，按弱→强排序输出各模型诊断。`;
  }
}
```

### 3. 预处理服务

```typescript
// services/preprocessService.ts
export class PreprocessService {
  extractFeatures(content: string, brand: string) {
    return {
      wordCount: content.length,
      dataCount: this.countDataPoints(content),
      brandMentions: this.countBrandMentions(content, brand),
      hasTable: /\|.*\|/.test(content),
      hasFAQ: /问：|Q:|答：|A:/.test(content),
      marketing: this.detectMarketingWords(content),
      marketingScore: this.calculateMarketingScore(content),
      firstParagraph: content.slice(0, 200),
      lastParagraph: content.slice(-200),
      structure: this.analyzeStructure(content)
    };
  }
  
  private countDataPoints(content: string): number {
    const patterns = [
      /\d+%/g,
      /\d+元/g,
      /\d+年/g,
      /\d+月/g,
      /\d+克/g,
      /\d+倍/g
    ];
    
    let count = 0;
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    });
    
    return count;
  }
  
  private detectMarketingWords(content: string) {
    const wordlib = loadMarketingWordlib();
    const hits = { strong: [], medium: [], weak: [] };
    
    // 本地匹配，不消耗AI token
    wordlib.strong.forEach(word => {
      if (content.includes(word)) hits.strong.push(word);
    });
    wordlib.medium.forEach(word => {
      if (content.includes(word)) hits.medium.push(word);
    });
    wordlib.weak.forEach(word => {
      if (content.includes(word)) hits.weak.push(word);
    });
    
    return hits;
  }
  
  private calculateMarketingScore(content: string): number {
    const hits = this.detectMarketingWords(content);
    const deduction = hits.strong.length * 15 + 
                     hits.medium.length * 8 + 
                     hits.weak.length * 3;
    return Math.max(0, 100 - deduction);
  }
}
```

---

## 📋 实施检查清单

- [x] 词库已外置到`data/marketing_wordlib.json`
- [x] 本地评分逻辑已实现
- [ ] 创建精简版prompt模板
- [ ] 实现智能特征提取
- [ ] 实现动态prompt组装
- [ ] 测试token使用量
- [ ] 配置Prompt Caching（如支持）
- [ ] 封装为Skill配置文件
- [ ] 性能测试和成本核算

---

## 🎓 最佳实践总结

1. **能本地算的绝不用AI** - 营销词检测、字数统计、基础评分
2. **能摘要的绝不传全文** - 提取关键特征，传递结构化数据
3. **能缓存的绝不重复发** - 利用Prompt Caching
4. **能分层的绝不一次性** - 按需加载详细规则
5. **能结构化的绝不自然语言** - Function Calling优于长prompt

**预期效果**: Token使用量从4800降至700，节省85%成本！
