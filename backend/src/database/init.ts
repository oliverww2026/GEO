import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';

let db: Database.Database | null = null;

/**
 * 获取数据库实例（单例）
 * 默认存储在 data/geo.db
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  // 优先使用 DB_PATH 环境变量（Render 持久化磁盘），否则本地项目目录
  const dbPath = process.env.DB_PATH || (() => {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'geo.db');
  })();
  console.log(`[DB] 数据库路径: ${dbPath}`);
  // 确保数据库文件所在目录存在
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
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

  // 订单表
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_type TEXT NOT NULL DEFAULT 'single',
      amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      trade_no TEXT NOT NULL DEFAULT '',
      out_trade_no TEXT NOT NULL DEFAULT '',
      expire_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 每日使用次数表
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
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

  // 数据库迁移：为线上已有数据库补充缺失的列
  runMigrations();

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
 * 数据库迁移：检测并补充线上旧 schema 中缺失的列
 * SQLite ALTER TABLE 不支持 IF NOT EXISTS，用 try/catch 处理
 */
function runMigrations(): void {
  if (!db) return;

  // 定义所有可能缺失的列（按依赖顺序）
  const colMigrations = [
    // enterprises 表 - 从最初最简 schema 逐步补全
    { name: 'enterprises.invite_code', table: 'enterprises', col: 'invite_code', colDef: 'TEXT' },
    { name: 'enterprises.brand_name', table: 'enterprises', col: 'brand_name', colDef: "TEXT NOT NULL DEFAULT ''" },
    { name: 'enterprises.brand_position', table: 'enterprises', col: 'brand_position', colDef: "TEXT NOT NULL DEFAULT ''" },
    { name: 'enterprises.service_city', table: 'enterprises', col: 'service_city', colDef: "TEXT NOT NULL DEFAULT ''" },
    { name: 'enterprises.api_key', table: 'enterprises', col: 'api_key', colDef: "TEXT NOT NULL DEFAULT ''" },
    { name: 'enterprises.api_base_url', table: 'enterprises', col: 'api_base_url', colDef: "TEXT NOT NULL DEFAULT 'https://zenmux.ai/api/v1'" },
    { name: 'enterprises.api_model', table: 'enterprises', col: 'api_model', colDef: "TEXT NOT NULL DEFAULT 'deepseek/deepseek-v4-pro'" },
    { name: 'enterprises.auth_token', table: 'enterprises', col: 'auth_token', colDef: "TEXT NOT NULL DEFAULT ''" },
    // analysis_logs 表
    { name: 'analysis_logs.overall_score', table: 'analysis_logs', col: 'overall_score', colDef: 'REAL' },
  ];

  for (const mig of colMigrations) {
    try {
      // 先检查列是否已存在
      const colInfo = db.pragma(`table_info(${mig.table})`) as any[];
      const exists = colInfo.some((c: any) => c.name === mig.col);

      if (!exists) {
        db.exec(`ALTER TABLE ${mig.table} ADD COLUMN ${mig.col} ${mig.colDef}`);
        console.log(`[Migration] ✓ 已添加: ${mig.name}`);

        // 特殊处理 invite_code：为已有记录生成唯一邀请码
        if (mig.col === 'invite_code') {
          const rows = db.prepare(`SELECT id FROM ${mig.table} WHERE invite_code IS NULL OR invite_code = ''`).all() as any[];
          for (const row of rows) {
            const code = generateInviteCode();
            db.prepare(`UPDATE ${mig.table} SET invite_code = ? WHERE id = ?`).run(code, row.id);
            console.log(`[Migration]   为企业 ID=${row.id} 生成邀请码: ${code}`);
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Migration] ✗ ${mig.name} 失败:`, err.message);
    }
  }
}

/**
 * 初始化默认数据（演示用）
 */
function seedDefaultData(): void {
  if (!db) return;

  // 固定邀请码，避免每次重启后邀请码变化
  const inviteCode = process.env.DEFAULT_INVITE_CODE || 'JIUJIN';
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

  // 预置管理员账号（固定账密，避免每次重启后需要重新注册）
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'geo2024';
  const adminPasswordHash = bcrypt.hashSync(adminPassword, 10);

  // 获取刚创建的企业 ID
  const enterprise = db!.prepare('SELECT id FROM enterprises WHERE invite_code = ?').get(inviteCode) as any;
  if (enterprise) {
    db!.prepare(`
      INSERT INTO users (enterprise_id, username, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).run(enterprise.id, adminUsername, adminPasswordHash, '管理员');
  }

  console.log('========================================');
  console.log('  🏢 演示企业已创建');
  console.log(`  📨 企业邀请码: ${inviteCode}`);
  console.log(`  👤 管理员账号: ${adminUsername}`);
  console.log(`  🔑 管理员密码: ${adminPassword}`);
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