# GEO 商业化工具项目

本项目用于支撑黄金回收行业的 GEO 商业化产品原型。当前已完成：

- `prompt/geo-commercial-prompt-v2.3.md`：精简后但保留全部核心结构的产品逻辑 prompt
- `prompt/marketing-wordlib.md`：营销词库说明文档
- `data/marketing_wordlib.json`：分级敏感营销词库数据
- `prompt/marketing-wordlib-sources.md`：在线来源检索记录与后续更新指引

## 说明

1. prompt 已优化为更稳定的执行版本，保留核心结构和评分规则。
2. 词库已按强/中/弱三档整理，适配“营销语气风险”判定与扣分逻辑。
3. 后续可在 `data/marketing_wordlib.json` 中补充新词，并同步更新 prompt 中的敏感词条。

## 项目结构

```
GEO/
├── backend/               # 后端服务（Node.js + Express + TypeScript）
│   ├── src/
│   │   ├── index.ts      # 主入口
│   │   ├── types/        # 类型定义
│   │   ├── services/     # 业务逻辑服务
│   │   └── routes/       # API 路由
│   ├── package.json
│   └── README.md
├── frontend/              # 前端项目（React + TypeScript + Ant Design）
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── types/        # TypeScript 类型定义
│   │   └── ...
│   ├── package.json
│   └── README.md
├── data/                  # 数据文件
│   └── marketing_wordlib.json
├── docs/                  # 文档
│   ├── frontend-design-guide.md
│   └── design-decisions.md
├── prompt/                # Prompt 文件
│   ├── geo-commercial-prompt-v2.3.md
│   ├── marketing-wordlib.md
│   └── marketing-wordlib-sources.md
└── README.md
```

## 快速开始

### 后端服务

```bash
cd backend
npm install    # 安装依赖
npm run dev    # 启动开发服务器（http://localhost:3001）
```

详见 [backend/README.md](backend/README.md)

### 前端项目

```bash
cd frontend
npm install    # 安装依赖
npm run dev    # 启动开发服务器（http://localhost:3000）
```

详见 [frontend/README.md](frontend/README.md)

### 完整启动流程

1. **启动后端**（终端1）:
   ```bash
   cd backend
   npm run dev
   ```

2. **启动前端**（终端2）:
   ```bash
   cd frontend
   npm run dev
   ```

3. 访问 `http://localhost:3000` 使用应用

## 🚀 生产环境部署

### 快速部署（推荐）

```bash
# 1. 一键部署（构建前后端）
./deploy.sh

# 2. 启动生产服务
./start-production.sh

# 3. 访问应用
# 前端: http://localhost:4173
# 后端: http://localhost:3001
```

### 停止服务

```bash
./stop-production.sh
```

### 详细部署文档

查看完整的部署指南：[docs/deployment-guide.md](docs/deployment-guide.md)

包含：
- 📋 完整部署步骤
- 📊 真实数据测试案例
- 🔍 健康检查方法
- 🐛 故障排查指南
- 📈 性能优化建议

## 📊 测试真实数据

部署成功后，您可以使用以下测试案例验证效果：

### 测试案例 1：高质量内容
```
久久金回收成立于2015年，在北京、上海、深圳设有实体门店。截至2024年12月，已服务超过50,000名客户，客户满意度达98.5%（数据来源：久久金内部统计）。

我们的鉴定师均持有国家认证的贵金属鉴定资格证书，采用X射线荧光光谱仪（XRF）进行无损检测，确保黄金纯度测定精确到99.9%。

上门回收服务覆盖全市主城区，预约后2小时内到达。现场称重、现场报价、现场结算，全程透明可追溯。
```

### 测试案例 2：营销词过多（需要优化）
```
我们是行业领先的专业团队，提供唯一的优质服务！

选择我们，您将获得最好的体验和最高的价格！我们的专业团队拥有丰富经验，绝对保证您的满意！

立即联系我们，享受超值优惠！
```

更多测试案例请查看 [部署指南](docs/deployment-guide.md#测试真实数据)

## 下一步建议

### 已完成 ✅
- [x] 产品逻辑 Prompt 设计
- [x] 营销词库数据整理
- [x] 前端设计指南
- [x] 前端项目框架搭建（React + TypeScript + Ant Design）
- [x] 主页面和结果页面组件
- [x] 搭建后端 API 服务
- [x] 实现内容分析逻辑
- [x] 接入营销词库检测
- [x] 生产环境部署脚本
- [x] 部署文档

### 进行中 🚧
- [ ] 前后端联调优化
- [ ] 真实数据测试和调优

### 待开发 📋
- [ ] 文件上传功能
- [ ] PDF 报告导出
- [ ] 用户系统
- [ ] 历史记录管理
