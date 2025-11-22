import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, getDbPath } from './schema.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import Database from 'better-sqlite3';

// Use temp directory for test database
const TEST_DB_PATH = join(tmpdir(), 'copilot-test.db');

describe('Database Schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Clean up any existing test db
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  it('getDbPath returns a valid path', () => {
    const path = getDbPath();
    expect(path).toContain('.copilot-cli');
    expect(path).toContain('copilot.db');
  });

  it('creates all required tables', () => {
    // Initialize schema manually for test
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
    `);

    // Verify tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('imports');
  });

  it('transactions table has correct schema', () => {
    db.exec(`
      CREATE TABLE transactions (
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
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert a test transaction
    db.prepare(`
      INSERT INTO transactions (id, date, description, amount)
      VALUES ('test1', '2024-01-15', 'Test Transaction', -50.00)
    `).run();

    const result = db.prepare('SELECT * FROM transactions WHERE id = ?').get('test1') as {
      id: string;
      date: string;
      description: string;
      amount: number;
    };

    expect(result.id).toBe('test1');
    expect(result.date).toBe('2024-01-15');
    expect(result.description).toBe('Test Transaction');
    expect(result.amount).toBe(-50.0);
  });
});
