import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import analysisRoutes from './routes/analysisRoutes';
import authRoutes from './auth/authRoutes';
import adminRoutes from './auth/adminRoutes';
import { getDatabase } from './database/init';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim());

// 初始化数据库
getDatabase();
console.log('[DB] 数据库已初始化');

// 静态文件 - 生产环境 serve 前端构建产物
const frontendDist = path.join(__dirname, '..', 'public');
app.use(express.static(frontendDist));
console.log(`[Static] 静态文件目录: ${frontendDist}`);

// 中间件
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] 拒绝来源: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 路由
app.use('/api', authRoutes);          // 认证路由（登录、获取当前用户）
app.use('/api', analysisRoutes);      // 分析路由（含免登录公开接口 /analysis/public）
app.use('/api', adminRoutes);         // 管理路由（管理员专用：企业/用户管理）

// SPA fallback - 所有非 API 请求返回前端 index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).json({
        message: 'GEO智测工具 Backend API',
        version: '1.0.0',
      });
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: '路由不存在',
    path: req.path
  });
});

// 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`🚀 GEO Backend API 已启动`);
  console.log(`📡 监听端口: ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS 允许来源: ${CORS_ORIGINS.join(', ')}`);
  console.log(`🏢 应用模式: ${process.env.APP_MODE || 'enterprise'}`);
  console.log('=================================');
});

export default app;