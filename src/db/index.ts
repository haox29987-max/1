import Database from 'better-sqlite3';

const db = new Database('tiktok_monitor.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    avatar_url TEXT,
    type TEXT CHECK(type IN ('internal', 'external')) NOT NULL DEFAULT 'external',
    status TEXT DEFAULT 'active',
    deleted_at DATETIME,
    last_updated DATETIME DEFAULT (datetime('now', 'localtime')),
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    heart_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    video_id TEXT NOT NULL UNIQUE,
    desc TEXT,
    create_time INTEGER,
    duration INTEGER DEFAULT 0,
    category TEXT,
    play_count INTEGER DEFAULT 0,
    digg_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    cover_url TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS video_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    video_id TEXT, 
    play_count INTEGER, 
    digg_count INTEGER,
    comment_count INTEGER,
    share_count INTEGER,
    timestamp DATETIME DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration for existing tables
try {
  db.exec("ALTER TABLE accounts ADD COLUMN status TEXT DEFAULT 'active'");
} catch (e) {}

try {
  db.exec("ALTER TABLE accounts ADD COLUMN deleted_at DATETIME");
} catch (e) {}

try {
  db.exec("ALTER TABLE snapshots ADD COLUMN play_count INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE videos ADD COLUMN duration INTEGER DEFAULT 0");
} catch (e) {}

try {
  db.exec("ALTER TABLE videos ADD COLUMN category TEXT");
} catch (e) {}

// Insert default schedule if not exists (e.g., daily at 08:00)
const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('schedule_time', '08:00')");
stmt.run();

export default db;