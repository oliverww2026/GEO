# GEO 智测工具 - 前端项目

基于 React + TypeScript + Ant Design 的黄金回收行业内容分析工具前端应用。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Ant Design 5** - UI 组件库
- **Vite** - 构建工具
- **React Router** - 路由管理

## 项目结构

```
frontend/
├── src/
│   ├── pages/          # 页面组件
│   │   ├── HomePage.tsx      # 主页（输入表单）
│   │   └── ResultPage.tsx    # 结果页（分析报告）
│   ├── types/          # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.tsx         # 主应用组件
│   ├── App.css         # 应用样式
│   ├── main.tsx        # 应用入口
│   └── index.css       # 全局样式
├── index.html          # HTML 模板
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 3. 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录

### 4. 预览生产构建

```bash
npm run preview
```

## 功能特性

### 主页（HomePage）
- ✅ 品牌信息配置（品牌名称、定位、服务城市）
- ✅ 内容输入（支持大文本输入，实时字数统计）
- ✅ 投放渠道选择（多选）
- ✅ 表单验证
- ✅ 分析提交

### 结果页（ResultPage）
- ✅ 立即行动清单
- ✅ 核心数据展示（综合评分、召回友好度、字数统计）
- ✅ 各模型友好度一览
- ✅ 各维度评分详情（进度条可视化）
- ✅ 营销词命中表
- ✅ 优化建议详情（可折叠）
- ✅ 风险声明
- ✅ 导出报告功能（待实现）

## 开发计划

### Phase 1: MVP ✅
- [x] 品牌信息配置
- [x] 文本输入与分析
- [x] 基础评分展示
- [x] 营销词检测

### Phase 2: 核心功能（进行中）
- [ ] 文件上传支持
- [ ] 接入后端 API
- [ ] 真实数据分析
- [ ] 数据可视化增强

### Phase 3: 增强功能
- [ ] 导出 PDF 报告
- [ ] 历史记录管理
- [ ] 多品牌配置
- [ ] 用户系统

## 注意事项

- 当前使用模拟数据进行展示
- 需要配合后端 API 实现真实的内容分析功能
- 最小屏幕宽度建议：1280px（桌面端优先）

## 相关文档

- [前端设计指南](../docs/frontend-design-guide.md)
- [产品逻辑 Prompt](../prompt/geo-commercial-prompt-v2.3.md)
- [营销词库说明](../prompt/marketing-wordlib.md)
