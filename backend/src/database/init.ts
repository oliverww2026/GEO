import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

let db: Database.Database | null = null;

/**
 * 获取数据库实例（单例）
 * 默认存储在 data/geo.db
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = process.env.DB_PATH || path.join(dataDir, 'geo.db');
  db = new Database(dbPath);

  // 启用 WAL 模式提升并发性能
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initTables();

  return db;
}

/**
 * 创建数据库表
 */
function initTables(): void {
  if (!db) return;

  // 企业表
  db.exec(`
    CREATE TABLE IF NOT EXISTS enterprises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      invite_code TEXT NOT NULL UNIQUE,
      brand_name TEXT NOT NULL DEFAULT '',
      brand_position TEXT NOT NULL DEFAULT '',
      service_city TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      api_base_url TEXT NOT NULL DEFAULT 'https://zenmux.ai/api/v1',
      api_model TEXT NOT NULL DEFAULT 'deepseek/deepseek-v4-pro',
      auth_token TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enterprise_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'employee',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (enterprise_id) REFERENCES enterprises(id),
      UNIQUE(enterprise_id, username)
    );
  `);

  // 分析记录表（完整存储分析数据）
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      enterprise_id INTEGER NOT NULL,
      input_content TEXT NOT NULL DEFAULT '',
      content_length INTEGER NOT NULL DEFAULT 0,
      channels TEXT NOT NULL DEFAULT '',
      duration_ms INTEGER NOT NULL DEFAULT 0,
      success INTEGER NOT NULL DEFAULT 1,
      result_json TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      overall_score REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
    );
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_enterprise ON users(enterprise_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_analysis_logs_user ON analysis_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_logs_enterprise ON analysis_logs(enterprise_id);
    CREATE INDEX IF NOT EXISTS idx_analysis_logs_created ON analysis_logs(created_at);
  `);

  // 如果企业表为空，创建演示企业并生成邀请码
  const count = db.prepare('SELECT COUNT(*) as cnt FROM enterprises').get() as { cnt: number };
  if (count.cnt === 0) {
    console.log('[DB] 初始化默认演示企业');
    seedDefaultData();
  }
}

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

/**
 * 初始化默认数据（演示用）
 */
function seedDefaultData(): void {
  if (!db) return;

  // 创建默认企业（管理员首次启动后通过注册创建用户）
  const inviteCode = generateInviteCode();
  const insertEnterprise = db.prepare(`
    INSERT INTO enterprises (name, invite_code, brand_name, brand_position, service_city, api_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertEnterprise.run(
    '演示企业',
    inviteCode,
    '久久金',
    '专业黄金回收管家',
    '深圳',
    process.env.AI_API_KEY || ''
  );

  console.log('========================================');
  console.log('  🏢 演示企业已创建');
  console.log(`  📨 企业邀请码: ${inviteCode}`);
  console.log('  👉 注册时填写此邀请码即可加入企业');
  console.log('========================================');
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}