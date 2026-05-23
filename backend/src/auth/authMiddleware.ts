import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from './authService';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

/**
 * JWT 鉴权中间件 - 必须登录
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: '未登录',
      message: '请先登录后再使用',
      redirectToLogin: true,
    });
    return;
  }

  const token = authHeader.slice(7); // 去掉 "Bearer "
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({
      error: '登录已过期',
      message: '登录凭证已过期，请重新登录',
      redirectToLogin: true,
    });
    return;
  }

  req.currentUser = user;
  next();
}

/**
 * 可选鉴权中间件 - 登录与否都能访问
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) {
      req.currentUser = user;
    }
  }
  next();
}

/**
 * 管理员鉴权中间件
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({
      error: '未登录',
      message: '请先登录',
    });
    return;
  }

  if (req.currentUser.role !== 'admin') {
    res.status(403).json({
      error: '权限不足',
      message: '仅管理员可执行此操作',
    });
    return;
  }

  next();
}