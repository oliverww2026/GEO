# GEO 项目生产环境部署指南

## 📋 部署概览

本文档提供 GEO 智测工具的完整生产环境部署指南，包括一键部署脚本和手动部署步骤。

## 🚀 快速部署（推荐）

### 1. 一键部署并启动

```bash
# 在项目根目录执行
./deploy.sh
```

这个脚本会自动完成：
- ✅ 检查 Node.js 和 npm 环境
- ✅ 安装后端依赖
- ✅ 构建后端项目（TypeScript → JavaScript）
- ✅ 安装前端依赖
- ✅ 构建前端项目（生成优化的静态文件）

### 2. 启动生产服务

```bash
./start-production.sh
```

这个脚本会：
- ✅ 检查构建文件是否存在
- ✅ 检查端口占用情况
- ✅ 后台启动后端服务（端口 3001）
- ✅ 后台启动前端服务（端口 4173）
- ✅ 生成日志文件

### 3. 停止服务

```bash
./stop-production.sh
```

## 🌐 访问地址

部署成功后，可以通过以下地址访问：

- **前端应用**: http://localhost:4173
- **后端 API**: http://localhost:3001
- **健康检查**: http://localhost:3001/api/health

## 📊 测试真实数据

### 示例测试内容

您可以使用以下真实场景的内容进行测试：

#### 测试案例 1：高质量内容
```
久久金回收成立于2015年，在北京、上海、深圳设有实体门店。截至2024年12月，已服务超过50,000名客户，客户满意度达98.5%（数据来源：久久金内部统计）。

我们的鉴定师均持有国家认证的贵金属鉴定资格证书，采用X射线荧光光谱仪（XRF）进行无损检测，确保黄金纯度测定精确到99.9%。

上门回收服务覆盖全市主城区，预约后2小时内到达。现场称重、现场报价、现场结算，全程透明可追溯。
```

#### 测试案例 2：营销词过多（需要优化）
```
我们是行业领先的专业团队，提供唯一的优质服务！

选择我们，您将获得最好的体验和最高的价格！我们的专业团队拥有丰富经验，绝对保证您的满意！

立即联系我们，享受超值优惠！
```

#### 测试案例 3：数据不足（需要优化）
```
我们提供黄金回收服务，价格公道，服务周到。

多年经验，值得信赖。欢迎咨询。
```

### 测试步骤

1. 打开浏览器访问 http://localhost:4173
2. 在首页输入框中粘贴测试内容
3. 点击"开始分析"按钮
4. 查看分析结果，包括：
   - 综合评分
   - 各模型友好度
   - 立即行动清单（具体改写建议）
   - 各维度评分详情
   - 营销词命中情况

## 📁 项目结构

```
GEO/
├── backend/
│   ├── dist/              # 构建后的后端代码（生产环境运行）
│   ├── src/               # 后端源代码
│   ├── .env.production    # 生产环境配置
│   └── package.json
├── frontend/
│   ├── dist/              # 构建后的前端静态文件
│   ├── src/               # 前端源代码
│   └── package.json
├── logs/
│   ├── backend.log        # 后端运行日志
│   └── frontend.log       # 前端运行日志
├── deploy.sh              # 部署脚本
├── start-production.sh    # 启动脚本
└── stop-production.sh     # 停止脚本
```

## 🔧 手动部署步骤

如果自动脚本遇到问题，可以按以下步骤手动部署：

### 后端部署

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 启动服务
NODE_ENV=production npm start
```

### 前端部署

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 预览生产构建
npm run preview
```

## 📝 日志查看

### 实时查看日志

```bash
# 查看后端日志
tail -f logs/backend.log

# 查看前端日志
tail -f logs/frontend.log

# 同时查看两个日志
tail -f logs/*.log
```

### 日志位置

- 后端日志：`logs/backend.log`
- 前端日志：`logs/frontend.log`

## 🔍 健康检查

### 检查后端服务

```bash
curl http://localhost:3001/api/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2026-05-17T09:16:53.068Z",
  "service": "GEO Backend API"
}
```

### 检查前端服务

```bash
curl -I http://localhost:4173
```

预期响应：HTTP 200 OK

### 检查端口占用

```bash
# 检查后端端口
lsof -i:3001

# 检查前端端口
lsof -i:4173
```

## ⚙️ 环境配置

### 后端环境变量

文件：`backend/.env.production`

```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=*
```

### 修改配置

如需修改端口或其他配置：

1. 编辑 `backend/.env.production`
2. 重启后端服务

```bash
# 停止服务
./stop-production.sh

# 重新启动
./start-production.sh
```

## 🐛 故障排查

### 问题 1：端口被占用

**症状**：启动时提示端口已被占用

**解决方案**：
```bash
# 查找占用端口的进程
lsof -ti:3001  # 后端
lsof -ti:4173  # 前端

# 停止进程
kill <PID>

# 或使用停止脚本
./stop-production.sh
```

### 问题 2：构建失败

**症状**：`./deploy.sh` 执行失败

**解决方案**：
```bash
# 清理依赖重新安装
cd backend && rm -rf node_modules package-lock.json && npm install
cd ../frontend && rm -rf node_modules package-lock.json && npm install

# 重新构建
cd .. && ./deploy.sh
```

### 问题 3：服务无法访问

**症状**：浏览器无法打开页面

**解决方案**：
```bash
# 1. 检查服务是否运行
lsof -i:3001
lsof -i:4173

# 2. 查看日志
tail -f logs/backend.log
tail -f logs/frontend.log

# 3. 重启服务
./stop-production.sh
./start-production.sh
```

### 问题 4：API 请求失败

**症状**：前端页面打开但无法提交分析

**解决方案**：
```bash
# 1. 检查后端健康状态
curl http://localhost:3001/api/health

# 2. 检查 CORS 配置
# 编辑 backend/.env.production，确保 CORS_ORIGIN 正确

# 3. 重启后端
./stop-production.sh
./start-production.sh
```

## 📈 性能优化建议

### 1. 前端优化

当前前端构建文件较大（~992KB），建议：

- 使用代码分割（Code Splitting）
- 按需加载 Ant Design 组件
- 启用 gzip 压缩

### 2. 后端优化

- 使用 PM2 进行进程管理
- 配置反向代理（Nginx）
- 启用日志轮转

### 3. 使用 PM2（推荐用于生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start dist/index.js --name geo-backend

# 启动前端（需要配置静态文件服务器）
pm2 start "npm run preview" --name geo-frontend

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 停止服务
pm2 stop all
```

## 🔐 安全建议

1. **生产环境部署时**：
   - 修改 `CORS_ORIGIN` 为具体域名
   - 使用 HTTPS
   - 配置防火墙规则
   - 定期更新依赖包

2. **数据安全**：
   - 不要在日志中记录敏感信息
   - 定期备份数据
   - 实施访问控制

## 📞 技术支持

如遇到问题，请检查：

1. Node.js 版本：建议 v18+ 或 v20+
2. npm 版本：建议 v9+
3. 系统要求：macOS、Linux 或 Windows（WSL）

## 🎉 部署成功验证清单

- [ ] 后端服务正常启动（端口 3001）
- [ ] 前端服务正常启动（端口 4173）
- [ ] 健康检查接口返回正常
- [ ] 前端页面可以正常访问
- [ ] 可以提交测试内容并获得分析结果
- [ ] 日志文件正常生成
- [ ] 各项功能测试通过

---

**最后更新时间**: 2026-05-17
**版本**: v1.0.0
