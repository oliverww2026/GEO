# 虎皮椒支付集成指南

## 概述

GEO 项目使用**虎皮椒支付**作为第三方支付服务商，支持微信和支付宝支付。

## 需要的操作

### 1. 注册虎皮椒账户

访问 [虎皮椒支付官网](https://www.hupijiao.com) 注册商户账户

### 2. 获取 API 凭证

登录虎皮椒后台，获取以下信息：
- **AppID**：应用ID
- **AppSecret**：应用密钥
- **Notify URL**：异步回调地址（后端接收支付结果）
- **Return URL**：同步回调地址（支付成功后跳转）

### 3. 配置环境变量

在 `.env` 文件中添加：

```bash
# 虎皮椒支付配置
HUPI_APPID=your_app_id
HUPI_APPSECRET=your_app_secret
HUPI_NOTIFY_URL=https://yourdomain.com/api/pay/notify
HUPI_RETURN_URL=https://yourdomain.com/pay-success
HUPI_PAY_URL=https://api.hupijiao.com/submit
```

### 4. 配置回调地址

在虎皮椒后台配置：
- **异步通知地址**：`https://yourdomain.com/api/pay/notify`
- **同步回调地址**：`https://yourdomain.com/pay-success`

## 支付流程

```
用户选择套餐
    ↓
前端调用 POST /api/pay/create
    ↓
后端生成订单，返回支付链接
    ↓
前端打开虎皮椒支付页面（新窗口）
    ↓
用户在虎皮椒页面完成支付
    ↓
虎皮椒异步回调 /api/pay/notify（更新订单状态）
    ↓
虎皮椒同步回调 /pay-success（显示成功页面）
    ↓
前端轮询 GET /api/pay/query/:outTradeNo 检查支付状态
    ↓
支付成功，配额更新
```

## API 端点

### 创建订单
```
POST /api/pay/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "planType": "monthly" | "yearly"
}

Response:
{
  "success": true,
  "data": {
    "outTradeNo": "GEO_123_1234567890",
    "payUrl": "https://api.hupijiao.com/submit?...",
    "amount": 14900
  }
}
```

### 查询订单状态
```
GET /api/pay/query/:outTradeNo
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "status": "paid" | "pending" | "failed",
    "planType": "monthly",
    "amount": 14900
  }
}
```

### 获取配额信息
```
GET /api/pay/quota
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "allowed": true,
    "planType": "monthly",
    "usedToday": 2,
    "limitToday": 10,
    "remaining": 8
  }
}
```

## 虎皮椒支付签名算法

后端使用 MD5 签名验证支付请求的合法性：

```typescript
hash = md5(appid + notify_url + return_url + time + title + total_fee + trade_order_id + appsecret)
```

## 测试

### 沙箱环境

虎皮椒提供沙箱环境用于测试：
- 修改 `HUPI_PAY_URL` 为沙箱地址
- 使用测试账户进行支付

### 测试支付

使用虎皮椒提供的测试卡号进行支付测试

## 常见问题

**Q: 支付超时怎么办？**
A: 前端轮询最多等待 5 分钟，如果支付成功但轮询超时，用户可以刷新页面重新检查配额

**Q: 支付失败后如何重试？**
A: 用户可以关闭弹窗后重新点击"开始分析"，系统会重新弹出付费弹窗

**Q: 如何处理异步回调？**
A: 后端 `/api/pay/notify` 接收虎皮椒的异步通知，验证签名后更新订单状态和用户配额

## 生产环境部署

1. 申请正式虎皮椒账户
2. 获取正式 AppID 和 AppSecret
3. 配置正式的回调地址（需要 HTTPS）
4. 更新环境变量
5. 测试完整支付流程
6. 上线

## 支持

如有问题，请联系虎皮椒技术支持：https://www.hupijiao.com/help
