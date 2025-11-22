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

    if (options.json) {
      console.log(JSON.stringify(rows, null, 2));
      db.close();
      return;
    }

    if (rows.length === 0) {
      // Check if database is empty (first run)
      const totalCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
      db.close();
      if (totalCount.count === 0) {
        console.log(chalk.yellow('No transactions in database yet.'));
        console.log(chalk.gray('\nTo get started:'));
        console.log(chalk.gray('  1. Export CSV from Copilot.money (Settings → Account → Export)'));
        console.log(chalk.gray('  2. Run: copilot import <path-to-csv>'));
        console.log(chalk.gray('\nOn macOS with Apple Shortcuts configured:'));
        console.log(chalk.gray('  copilot sync'));
      } else {
        console.log(chalk.yellow('No transactions found matching your filters.'));
        console.log(chalk.gray(`\nTry adjusting: --days, --category, --search, --min, --max`));
      }
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
    db.close();
  });
