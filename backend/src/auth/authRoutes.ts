import { Router, Request, Response } from 'express';
import { loginUser, registerUser, getEnterpriseByUserId } from './authService';
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
 * POST /api/auth/register
 * 用户自助注册
 */
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { inviteCode, username, password, displayName } = req.body;

    if (!inviteCode || !username || !password) {
      return res.status(400).json({
        error: '参数缺失',
        message: '请填写邀请码、用户名和密码',
      });
    }

    // 用户名格式校验
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        error: '用户名格式错误',
        message: '用户名需3-20位，仅支持字母、数字和下划线',
      });
    }

    const result = await registerUser(inviteCode, username, password, displayName || username);

    if (!result.success) {
      return res.status(400).json({
        error: '注册失败',
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      error: '服务器错误',
      message: '注册过程中发生错误，请稍后重试',
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