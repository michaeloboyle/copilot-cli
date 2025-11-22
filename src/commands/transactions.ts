import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getDb } from '../db/schema.js';

interface TransactionRow {
  date: string;
  description: string;
  category: string | null;
  amount: number;
}

export const transactionsCommand = new Command('transactions')
  .alias('tx')
  .description('Query transactions')
  .option('-d, --days <n>', 'Show last N days', '30')
  .option('-c, --category <name>', 'Filter by category')
  .option('-m, --min <amount>', 'Minimum amount')
  .option('-M, --max <amount>', 'Maximum amount')
  .option('-s, --search <term>', 'Search description/merchant')
  .option('-l, --limit <n>', 'Limit results', '50')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const db = getDb();

    let query = 'SELECT date, description, category, amount FROM transactions WHERE 1=1';
    const params: Record<string, unknown> = {};

    if (options.days) {
      query += ` AND date >= date('now', '-${parseInt(options.days)} days')`;
    }

    if (options.category) {
      query += ' AND category LIKE @category';
      params.category = `%${options.category}%`;
    }

    if (options.min) {
      query += ' AND amount >= @min';
      params.min = parseFloat(options.min);
    }

    if (options.max) {
      query += ' AND amount <= @max';
      params.max = parseFloat(options.max);
    }

    if (options.search) {
      query += ' AND (description LIKE @search OR merchant LIKE @search)';
      params.search = `%${options.search}%`;
    }

    query += ' ORDER BY date DESC';
    query += ` LIMIT ${parseInt(options.limit)}`;

    const rows = db.prepare(query).all(params) as TransactionRow[];
    db.close();

    if (options.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    if (rows.length === 0) {
      console.log(chalk.yellow('No transactions found'));
      return;
    }

    const table = new Table({
      head: ['Date', 'Description', 'Category', 'Amount'],
      colWidths: [12, 40, 20, 12],
    });

    rows.forEach((row) => {
      const amountStr = row.amount.toFixed(2);
      const amountColor = row.amount < 0 ? chalk.red : chalk.green;
      table.push([
        row.date,
        row.description.slice(0, 38),
        row.category || '-',
        amountColor(amountStr),
      ]);
    });

    console.log(table.toString());
    console.log(chalk.gray(`\nShowing ${rows.length} transactions`));
  });
