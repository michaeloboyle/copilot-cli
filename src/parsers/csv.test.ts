import { describe, it, expect } from 'vitest';
import { parseTransactionsCsv } from './csv.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('CSV Parser', () => {
  it('parses standard Copilot CSV format', () => {
    const csvContent = `Date,Description,Merchant,Category,Amount,Account
2024-01-15,Coffee Shop,Starbucks,Food & Drink,-5.50,Checking
2024-01-14,Paycheck,Employer,Income,2500.00,Checking
2024-01-13,Groceries,Whole Foods,Groceries,-150.25,Credit Card`;

    const tmpFile = join(tmpdir(), 'test-copilot.csv');
    writeFileSync(tmpFile, csvContent);

    const transactions = parseTransactionsCsv(tmpFile);

    expect(transactions).toHaveLength(3);
    expect(transactions[0]).toEqual({
      date: '2024-01-15',
      description: 'Coffee Shop',
      merchant: 'Starbucks',
      category: 'Food & Drink',
      amount: -5.5,
      account: 'Checking',
      notes: undefined,
      type: undefined,
    });

    expect(transactions[1].amount).toBe(2500);
    expect(transactions[2].amount).toBe(-150.25);

    unlinkSync(tmpFile);
  });

  it('handles amounts with currency symbols and commas', () => {
    const csvContent = `Date,Description,Amount
2024-01-15,Large Purchase,"$1,234.56"
2024-01-14,Refund,"($50.00)"`;

    const tmpFile = join(tmpdir(), 'test-currency.csv');
    writeFileSync(tmpFile, csvContent);

    const transactions = parseTransactionsCsv(tmpFile);

    expect(transactions[0].amount).toBe(1234.56);
    expect(transactions[1].amount).toBe(-50);

    unlinkSync(tmpFile);
  });
});
