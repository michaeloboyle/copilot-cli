import { parse } from 'csv-parse/sync';
import { readFileSync, createHash } from 'fs';
import { createHash as cryptoHash } from 'crypto';
import type Database from 'better-sqlite3';

export interface CopilotTransaction {
  date: string;
  description: string;
  merchant?: string;
  category?: string;
  amount: number;
  account?: string;
  notes?: string;
  type?: string;
}

interface CsvRecord {
  Date?: string;
  Description?: string;
  Merchant?: string;
  Category?: string;
  Amount?: string;
  Account?: string;
  Notes?: string;
  Type?: string;
  [key: string]: string | undefined;
}

export function parseTransactionsCsv(filePath: string): CopilotTransaction[] {
  const content = readFileSync(filePath, 'utf-8');

  const records: CsvRecord[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record) => ({
    date: normalizeDate(record.Date || record.date || ''),
    description: record.Description || record.description || '',
    merchant: record.Merchant || record.merchant,
    category: record.Category || record.category,
    amount: parseAmount(record.Amount || record.amount || '0'),
    account: record.Account || record.account,
    notes: record.Notes || record.notes,
    type: record.Type || record.type,
  }));
}

function normalizeDate(dateStr: string): string {
  // Handle various date formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toISOString().split('T')[0];
}

function parseAmount(amountStr: string): number {
  // Remove currency symbols, commas, handle parentheses for negatives
  let cleaned = amountStr.replace(/[$,]/g, '').trim();

  // Handle (100.00) format for negatives
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  return parseFloat(cleaned) || 0;
}

export function importTransactions(
  db: Database.Database,
  transactions: CopilotTransaction[],
  filename: string
): { imported: number; skipped: number } {
  const content = JSON.stringify(transactions);
  const checksum = cryptoHash('sha256').update(content).digest('hex');

  // Check if already imported
  const existing = db.prepare('SELECT id FROM imports WHERE checksum = ?').get(checksum);
  if (existing) {
    return { imported: 0, skipped: transactions.length };
  }

  const insertTx = db.prepare(`
    INSERT OR IGNORE INTO transactions (id, date, description, merchant, category, amount, account_id, notes, type)
    VALUES (@id, @date, @description, @merchant, @category, @amount, @account, @notes, @type)
  `);

  let imported = 0;
  const insertMany = db.transaction((txs: CopilotTransaction[]) => {
    for (const tx of txs) {
      const id = cryptoHash('sha256')
        .update(`${tx.date}|${tx.description}|${tx.amount}|${tx.account}`)
        .digest('hex')
        .slice(0, 16);

      const result = insertTx.run({
        id,
        date: tx.date,
        description: tx.description,
        merchant: tx.merchant || null,
        category: tx.category || null,
        amount: tx.amount,
        account: tx.account || null,
        notes: tx.notes || null,
        type: tx.type || null,
      });

      if (result.changes > 0) imported++;
    }
  });

  insertMany(transactions);

  // Record import
  db.prepare('INSERT INTO imports (filename, record_count, checksum) VALUES (?, ?, ?)')
    .run(filename, imported, checksum);

  return { imported, skipped: transactions.length - imported };
}
