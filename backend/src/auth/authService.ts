import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/init';

// JWT 密钥，生产环境请通过环境变量配置
const JWT_SECRET = process.env.JWT_SECRET || 'geo-platform-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface UserPayload {
  userId: number;
  enterpriseId: number;
  username: string;
  displayName: string;
  role: string;
}

export interface EnterpriseInfo {
  id: number;
  name: string;
  brandName: string;
  brandPosition: string;
  serviceCity: string;
  apiKey: string;
  apiBaseUrl: string;
  apiModel: string;
}

/**
 * 验证用户登录
 */
export async function loginUser(username: string, password: string): Promise<{
  token: string;
  user: UserPayload;
  enterprise: EnterpriseInfo;
} | null> {
  const db = getDatabase();

  // 查找用户
  const row = db.prepare(`
    SELECT u.id, u.enterprise_id, u.username, u.password_hash, u.display_name, u.role, u.is_active,
           e.id as e_id, e.name as e_name, e.brand_name, e.brand_position, e.service_city,
           e.api_key, e.api_base_url, e.api_model, e.is_active as e_active
    FROM users u
    JOIN enterprises e ON u.enterprise_id = e.id
    WHERE u.username = ?
  `).get(username) as any;

  if (!row) return null;

  // 验证密码
  const isValid = await bcrypt.compare(password, row.password_hash);
  if (!isValid) return null;

  // 检查用户和企业是否启用
  if (!row.is_active || !row.e_active) return null;

  const user: UserPayload = {
    userId: row.id,
    enterpriseId: row.enterprise_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };

  const enterprise: EnterpriseInfo = {
    id: row.e_id,
    name: row.e_name,
    brandName: row.brand_name,
    brandPosition: row.brand_position,
    serviceCity: row.service_city,
    apiKey: row.api_key,
    apiBaseUrl: row.api_base_url,
    apiModel: row.api_model,
  };

  // 生成 JWT
  const token = jwt.sign({ ...user }, JWT_SECRET, { expiresIn: '7d' });

  // 更新最后登录时间
  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.userId);

  return { token, user, enterprise };
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 根据 userId 获取企业信息
 */
export function getEnterpriseByUserId(userId: number): EnterpriseInfo | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT e.id, e.name, e.brand_name, e.brand_position, e.service_city,
           e.api_key, e.api_base_url, e.api_model
    FROM enterprises e
    JOIN users u ON u.enterprise_id = e.id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    brandName: row.brand_name,
    brandPosition: row.brand_position,
    serviceCity: row.service_city,
    apiKey: row.api_key,
    apiBaseUrl: row.api_base_url,
    apiModel: row.api_model,
  };
}

/**
 * 获取企业下的所有用户
 */
export function getUsersByEnterprise(enterpriseId: number) {
  const db = getDatabase();
  return db.prepare(`
    SELECT id, username, display_name, role, is_active, last_login_at, created_at
    FROM users WHERE enterprise_id = ?
    ORDER BY created_at DESC
  `).all(enterpriseId);
}