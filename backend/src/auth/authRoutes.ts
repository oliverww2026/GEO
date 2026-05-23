import { Router, Request, Response } from 'express';
import { loginUser, getEnterpriseByUserId } from './authService';
import { requireAuth, requireAdmin } from './authMiddleware';

const router = Router();

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: '参数缺失',
        message: '请输入用户名和密码',
      });
    }

    const result = await loginUser(username, password);

    if (!result) {
      return res.status(401).json({
        error: '登录失败',
        message: '用户名或密码错误，或账号已被禁用',
      });
    }

    res.json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
        enterprise: result.enterprise,
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '登录过程中发生错误，请稍后重试',
    });
  }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    const enterprise = getEnterpriseByUserId(user.userId);

    res.json({
      success: true,
      data: {
        user,
        enterprise,
      },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '获取用户信息失败',
    });
  }
});

/**
 * POST /api/auth/verify
 * 验证 Token 是否有效
 */
router.post('/auth/verify', requireAuth, (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Token 有效',
  });
});

export default router;