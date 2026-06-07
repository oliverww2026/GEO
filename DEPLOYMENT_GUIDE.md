# GEO 项目部署和域名配置指南

## 域名申请

### 是否需要域名？

**是的，需要域名。** 原因：

1. **虎皮椒支付回调需要 HTTPS 域名**
   - 异步回调地址：`https://yourdomain.com/api/pay/notify`
   - 同步回调地址：`https://yourdomain.com/pay-success`
   - 虎皮椒不接受 `localhost` 或 IP 地址

2. **生产环境需要域名**
   - 用户访问：`https://yourdomain.com`
   - 专业形象和信任度

3. **SSL 证书需要域名**
   - HTTPS 加密通信
   - 支付安全要求

### 域名申请步骤

#### 1. 选择域名注册商

常见的域名注册商：
- **阿里云**（推荐，国内最大）：https://wanwang.aliyun.com
- **腾讯云**：https://dnspod.cloud.tencent.com
- **GoDaddy**（国际）：https://www.godaddy.com
- **Namecheap**（国际）：https://www.namecheap.com

#### 2. 注册域名

以阿里云为例：
1. 访问阿里云域名注册页面
2. 搜索想要的域名（如 `geo-ai.com`）
3. 选择 `.com` / `.cn` / `.app` 等后缀
4. 加入购物车，完成支付
5. 实名认证（国内要求）
6. 等待审核（通常 1-3 天）

**推荐域名：**
- `geo-ai.com`
- `geo-test.com`
- `geo-analysis.com`
- `yourbrand-geo.com`

#### 3. 域名费用

- `.com` 域名：约 ¥55-70/年
- `.cn` 域名：约 ¥25-40/年
- `.app` 域名：约 ¥60-80/年

### DNS 配置

获得域名后，需要配置 DNS 指向你的服务器：

#### 方案 1：自建服务器（VPS）

1. **购买 VPS**
   - 阿里云 ECS：https://www.aliyun.com/product/ecs
   - 腾讯云 CVM：https://cloud.tencent.com/product/cvm
   - DigitalOcean：https://www.digitalocean.com
   - Linode：https://www.linode.com

   **推荐配置：**
   - CPU：2 核
   - 内存：4GB
   - 带宽：5Mbps
   - 月费：¥50-150

2. **配置 DNS A 记录**
   
   在域名注册商后台添加 DNS 记录：
   ```
   记录类型：A
   主机记录：@（或 www）
   记录值：你的 VPS 公网 IP
   TTL：600
   ```

3. **部署应用**
   ```bash
   # 登录 VPS
   ssh root@your_vps_ip
   
   # 安装 Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 克隆项目
   git clone https://github.com/yourname/geo.git
   cd geo
   
   # 安装依赖
   npm install
   
   # 编译
   npm run build
   
   # 启动（使用 PM2 管理进程）
   npm install -g pm2
   pm2 start npm --name "geo-backend" -- start
   ```

#### 方案 2：云平台一键部署（推荐新手）

**阿里云 App Engine（推荐）：**
1. 访问 https://www.aliyun.com/product/appengine
2. 创建应用
3. 绑定域名
4. 上传代码或连接 GitHub
5. 自动部署和 SSL 证书

**优点：**
- 自动 HTTPS 和 SSL 证书
- 自动扩容
- 无需管理服务器
- 月费：¥50-200

**腾讯云 CloudBase（推荐）：**
1. 访问 https://cloud.tencent.com/product/tcb
2. 创建环境
3. 绑定域名
4. 部署应用

### SSL 证书配置

#### 自动获取（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

#### 云平台自动配置

大多数云平台（阿里云、腾讯云）都提供免费 SSL 证书，自动配置和续期。

## 环境变量配置

### 开发环境（`.env.local`）

```bash
# 前端
VITE_API_BASE_URL=http://localhost:3001

# 后端
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# AI 配置
AI_API_KEY=your_ai_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# 虎皮椒支付（测试）
HUPI_APPID=test_app_id
HUPI_APPSECRET=test_app_secret
HUPI_NOTIFY_URL=http://localhost:3001/api/pay/notify
HUPI_RETURN_URL=http://localhost:3000/pay-success
HUPI_PAY_URL=https://sandbox.hupijiao.com/submit
```

### 生产环境（`.env.production`）

```bash
# 前端
VITE_API_BASE_URL=https://yourdomain.com

# 后端
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://yourdomain.com

# AI 配置
AI_API_KEY=your_ai_api_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4

# 虎皮椒支付（正式）
HUPI_APPID=your_real_app_id
HUPI_APPSECRET=your_real_app_secret
HUPI_NOTIFY_URL=https://yourdomain.com/api/pay/notify
HUPI_RETURN_URL=https://yourdomain.com/pay-success
HUPI_PAY_URL=https://api.hupijiao.com/submit
```

## 虎皮椒支付配置

### 1. 注册虎皮椒账户

访问 https://www.hupijiao.com 注册商户账户

### 2. 获取 API 凭证

登录后台获取：
- AppID
- AppSecret

### 3. 配置回调地址

在虎皮椒后台配置：
- **异步通知地址**：`https://yourdomain.com/api/pay/notify`
- **同步回调地址**：`https://yourdomain.com/pay-success`

### 4. 测试支付

使用虎皮椒提供的测试账户和测试卡号进行支付测试

## 完整部署流程

### 步骤 1：申请域名（1-3 天）

```bash
# 在阿里云/腾讯云申请域名
# 例如：geo-ai.com
```

### 步骤 2：购买服务器或使用云平台（即时）

```bash
# 选择方案 1（VPS）或方案 2（云平台）
```

### 步骤 3：配置 DNS（10 分钟）

```bash
# 在域名注册商后台添加 A 记录
# 指向你的服务器 IP
```

### 步骤 4：配置 SSL 证书（10 分钟）

```bash
# 使用云平台自动配置或 Let's Encrypt
```

### 步骤 5：部署应用（30 分钟）

```bash
# 克隆项目
git clone https://github.com/yourname/geo.git
cd geo

# 安装依赖
npm install

# 编译
npm run build

# 启动
npm start
```

### 步骤 6：配置虎皮椒支付（15 分钟）

```bash
# 1. 注册虎皮椒账户
# 2. 获取 AppID 和 AppSecret
# 3. 配置回调地址
# 4. 更新 .env.production
```

### 步骤 7：测试（30 分钟）

```bash
# 1. 访问 https://yourdomain.com
# 2. 注册账户
# 3. 测试分析功能
# 4. 测试支付流程
```

## 成本估算

| 项目 | 月费 | 年费 |
|------|------|------|
| 域名 | - | ¥55-70 |
| VPS（2核4GB） | ¥50-150 | ¥600-1800 |
| SSL 证书 | 免费 | 免费 |
| **总计** | **¥50-150** | **¥655-1870** |

**或使用云平台：**
| 项目 | 月费 | 年费 |
|------|------|------|
| 域名 | - | ¥55-70 |
| 云平台（App Engine） | ¥50-200 | ¥600-2400 |
| SSL 证书 | 免费 | 免费 |
| **总计** | **¥50-200** | **¥655-2470** |

## 常见问题

**Q: 没有域名可以测试支付吗？**
A: 不行。虎皮椒支付要求 HTTPS 域名，不接受 localhost 或 IP 地址。

**Q: 域名申请需要多久？**
A: 通常 1-3 天。国内域名需要实名认证。

**Q: 可以用免费域名吗？**
A: 不推荐。虎皮椒可能不接受免费域名，且不专业。

**Q: SSL 证书需要付费吗？**
A: 不需要。Let's Encrypt 和云平台都提供免费 SSL 证书。

**Q: 如何选择 VPS 还是云平台？**
A: 
- **VPS**：便宜，但需要自己管理
- **云平台**：贵一点，但自动化程度高，推荐新手

## 支持

如有问题，请联系：
- 域名注册商客服
- 虎皮椒技术支持：https://www.hupijiao.com/help
- 云平台技术支持
