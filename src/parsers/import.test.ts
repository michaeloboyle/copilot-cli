import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { importTransactions, CopilotTransaction } from './csv.js';
import Database from 'better-sqlite3';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DB_PATH = join(tmpdir(), 'copilot-import-test.db');

describe('Import Transactions', () => {
  let db: Database.Database;

  beforeEach(() => {
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    db = new Database(TEST_DB_PATH);
    db.pragma('journal_mode = WAL');

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT
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
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        imported_at TEXT DEFAULT CURRENT_TIMESTAMP,
        record_count INTEGER,
        checksum TEXT
      );
    `);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  it('imports transactions successfully', () => {
    const transactions: CopilotTransaction[] = [
      {
        date: '2024-01-15',
        description: 'Coffee Shop',
        merchant: 'Starbucks',
        category: 'Food & Drink',
        amount: -5.5,
        account: 'Checking',
      },
      {
        date: '2024-01-14',
        description: 'Paycheck',
        category: 'Income',
        amount: 2500.0,
        account: 'Checking',
      },
    ];

    const result = importTransactions(db, transactions, 'test.csv');

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);

    // Verify transactions in database
    const dbTransactions = db.prepare('SELECT * FROM transactions').all();
    expect(dbTransactions).toHaveLength(2);
  });

  it('skips duplicate imports based on checksum', () => {
    const transactions: CopilotTransaction[] = [
      {
        date: '2024-01-15',
        description: 'Coffee Shop',
        amount: -5.5,
      },
    ];

    // First import
    const result1 = importTransactions(db, transactions, 'test.csv');
    expect(result1.imported).toBe(1);

    // Second import with same data
    const result2 = importTransactions(db, transactions, 'test.csv');
    expect(result2.imported).toBe(0);
    expect(result2.skipped).toBe(1);
  });

  it('creates accounts from transactions', () => {
    const transactions: CopilotTransaction[] = [
      {
        date: '2024-01-15',
        description: 'Test',
        amount: -10.0,
        account: 'Savings Account',
      },
      {
        date: '2024-01-16',
        description: 'Test 2',
        amount: -20.0,
        account: 'Checking Account',
      },
    ];

    importTransactions(db, transactions, 'test.csv');

    const accounts = db.prepare('SELECT * FROM accounts').all();
    expect(accounts).toHaveLength(2);
  });

  it('handles transactions without accounts', () => {
    const transactions: CopilotTransaction[] = [
      {
        date: '2024-01-15',
        description: 'No Account Transaction',
        amount: -25.0,
      },
    ];

    const result = importTransactions(db, transactions, 'test.csv');
    expect(result.imported).toBe(1);

    const tx = db.prepare('SELECT * FROM transactions').get() as { account_id: string | null };
    expect(tx.account_id).toBeNull();
  });

  it('deduplicates transactions by content hash', () => {
    const transactions: CopilotTransaction[] = [
      {
        date: '2024-01-15',
        description: 'Same Transaction',
        amount: -10.0,
        account: 'Checking',
      },
      {
        date: '2024-01-15',
        description: 'Same Transaction',
        amount: -10.0,
        account: 'Checking',
      },
    ];

    const result = importTransactions(db, transactions, 'test.csv');

    // Should only import one since they have the same hash
    expect(result.imported).toBe(1);
  });

  it('records import metadata', () => {
    const transactions: CopilotTransaction[] = [
      { date: '2024-01-15', description: 'Test', amount: -10.0 },
    ];

    importTransactions(db, transactions, 'my-export.csv');

    const importRecord = db.prepare('SELECT * FROM imports').get() as {
      filename: string;
      record_count: number;
    };
    expect(importRecord.filename).toBe('my-export.csv');
    expect(importRecord.record_count).toBe(1);
  });
});
