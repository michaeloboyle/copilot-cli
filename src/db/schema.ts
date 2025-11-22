import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = join(homedir(), '.copilot-cli');
const DB_PATH = join(DATA_DIR, 'copilot.db');

export function getDb(): Database.Database {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      institution TEXT,
      balance REAL,
      currency TEXT DEFAULT 'USD',
      last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      date TEXT NOT NULL,
      description TEXT,
      merchant TEXT,
      category TEXT,
      amount REAL NOT NULL,
      type TEXT,
      notes TEXT,
      is_pending INTEGER DEFAULT 0,
      imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      color TEXT,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
      record_count INTEGER,
      checksum TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  `);
}

export function getDbPath(): string {
  return DB_PATH;
}
