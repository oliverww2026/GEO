import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../database/init';
import { requireAuth, requireAdmin } from './authMiddleware';

const router = Router();

// 所有管理接口都需要管理员权限（requireAuth + requireAdmin）
router.use(requireAuth, requireAdmin);

/**
 * 生成随机邀请码（6位字母数字）
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===================== 企业 CRUD =====================

/**
 * GET /api/admin/enterprises - 获取所有企业列表
 */
router.get('/admin/enterprises', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, name, invite_code, brand_name, brand_position, service_city,
             api_key, api_base_url, api_model, is_active,
             created_at, updated_at
      FROM enterprises ORDER BY created_at DESC
    `).all();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取企业列表失败:', error);
    res.status(500).json({ error: '服务器错误', message: '获取企业列表失败' });
  }
});

/**
 * POST /api/admin/enterprises - 创建新企业
 */
router.post('/admin/enterprises', (req: Request, res: Response) => {
  try {
    const { name, brandName, brandPosition, serviceCity, apiKey, apiBaseUrl, apiModel } = req.body;

    if (!name || !brandName) {
      return res.status(400).json({ error: '参数缺失', message: '企业名称和品牌名称为必填项' });
    }

    const db = getDatabase();

    // 检查企业名是否重复
    const existing = db.prepare('SELECT id FROM enterprises WHERE name = ?').get(name);
    if (existing) {
      return res.status(409).json({ error: '企业已存在', message: `企业名称 "${name}" 已存在` });
    }

    const inviteCode = generateInviteCode();

    const result = db.prepare(`
      INSERT INTO enterprises (name, invite_code, brand_name, brand_position, service_city, api_key, api_base_url, api_model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      inviteCode,
      brandName,
      brandPosition || '',
      serviceCity || '',
      apiKey || '',
      apiBaseUrl || 'https://zenmux.ai/api/v1',
      apiModel || 'deepseek/deepseek-v4-pro'
    );

    const newEnterprise = db.prepare('SELECT * FROM enterprises WHERE id = ?').get(result.lastInsertRowid);
    console.log(`[Admin] 创建企业: ${name} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({ success: true, data: newEnterprise });
  } catch (error) {
    console.error('创建企业失败:', error);
    res.status(500).json({ error: '服务器错误', message: '创建企业失败' });
  }
});

/**
 * PUT /api/admin/enterprises/:id - 更新企业信息
 */
router.put('/admin/enterprises/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, brandName, brandPosition, serviceCity, apiKey, apiBaseUrl, apiModel, isActive } = req.body;

    const db = getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (brandName !== undefined) { fields.push('brand_name = ?'); values.push(brandName); }
    if (brandPosition !== undefined) { fields.push('brand_position = ?'); values.push(brandPosition); }
    if (serviceCity !== undefined) { fields.push('service_city = ?'); values.push(serviceCity); }
    if (apiKey !== undefined) { fields.push('api_key = ?'); values.push(apiKey); }
    if (apiBaseUrl !== undefined) { fields.push('api_base_url = ?'); values.push(apiBaseUrl); }
    if (apiModel !== undefined) { fields.push('api_model = ?'); values.push(apiModel); }
    if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    fields.push('updated_at = datetime(\'now\')');

    if (fields.length === 1) {
      return res.status(400).json({ error: '无更新内容', message: '请提供至少一个要更新的字段' });
    }

    values.push(Number(id));
    db.prepare(`UPDATE enterprises SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM enterprises WHERE id = ?').get(Number(id));
    console.log(`[Admin] 更新企业 ID: ${id}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新企业失败:', error);
    res.status(500).json({ error: '服务器错误', message: '更新企业失败' });
  }
});

// ===================== 用户 CRUD =====================

/**
 * GET /api/admin/enterprises/:enterpriseId/users - 获取某企业下所有用户
 */
router.get('/admin/enterprises/:enterpriseId/users', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, enterprise_id, username, display_name, role, is_active, last_login_at, created_at
      FROM users WHERE enterprise_id = ?
      ORDER BY created_at ASC
    `).all(Number(req.params.enterpriseId));
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '服务器错误', message: '获取用户列表失败' });
  }
});

/**
 * POST /api/admin/enterprises/:enterpriseId/users - 在企业下创建新用户
 */
router.post('/admin/enterprises/:enterpriseId/users', (req: Request, res: Response) => {
  try {
    const enterpriseId = Number(req.params.enterpriseId);
    const { username, password, displayName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '参数缺失', message: '用户名和密码为必填项' });
    }

    const db = getDatabase();

    // 检查用户名在该企业下是否重复
    const existing = db.prepare(
      'SELECT id FROM users WHERE enterprise_id = ? AND username = ?'
    ).get(enterpriseId, username);
    if (existing) {
      return res.status(409).json({ error: '用户已存在', message: `用户名 "${username}" 在该企业下已存在` });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (enterprise_id, username, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(enterpriseId, username, passwordHash, displayName || username, role || 'employee');

    const newUser = db.prepare(
      'SELECT id, enterprise_id, username, display_name, role, is_active, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    console.log(`[Admin] 创建用户: ${username} (企业ID: ${enterpriseId}, 用户ID: ${result.lastInsertRowid})`);
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '服务器错误', message: '创建用户失败' });
  }
});

/**
 * PUT /api/admin/users/:id - 更新用户信息（启用/禁用、角色、密码等）
 */
router.put('/admin/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, role, isActive, password } = req.body;
    const db = getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    if (displayName !== undefined) { fields.push('display_name = ?'); values.push(displayName); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (isActive !== undefined) { fields.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    if (password !== undefined && password.trim() !== '') {
      fields.push('password_hash = ?');
      values.push(bcrypt.hashSync(password.trim(), 10));
    }
    fields.push('updated_at = datetime(\'now\')');

    if (fields.length === 1) {
      return res.status(400).json({ error: '无更新内容', message: '请提供至少一个要更新的字段' });
    }

    values.push(Number(id));
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(
      'SELECT id, enterprise_id, username, display_name, role, is_active, created_at FROM users WHERE id = ?'
    ).get(Number(id));

    console.log(`[Admin] 更新用户 ID: ${id}`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ error: '服务器错误', message: '更新用户失败' });
  }
});

export default router;