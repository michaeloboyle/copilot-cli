import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getDb } from '../db/schema.js';

interface CategorySum {
  category: string | null;
  total: number;
  count: number;
}

interface MonthlySum {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

function showFirstRunGuidance(): void {
  console.log(chalk.yellow('No transactions in database yet.'));
  console.log(chalk.gray('\nTo get started:'));
  console.log(chalk.gray('  1. Export CSV from Copilot.money (Settings → Account → Export)'));
  console.log(chalk.gray('  2. Run: copilot import <path-to-csv>'));
  console.log(chalk.gray('\nOn macOS with Apple Shortcuts configured:'));
  console.log(chalk.gray('  copilot sync'));
}

function isDatabaseEmpty(db: ReturnType<typeof getDb>): boolean {
  const result = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
  return result.count === 0;
}

export const summaryCommand = new Command('summary')
  .description('Show spending summary')
  .option('-d, --days <n>', 'Analyze last N days', '30')
  .option('--by-category', 'Group by category')
  .option('--by-month', 'Group by month')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const db = getDb();

    if (options.byCategory) {
      showByCategory(db, options);
    } else if (options.byMonth) {
      showByMonth(db, options);
    } else {
      showOverview(db, options);
    }

    db.close();
  });

function showByCategory(db: ReturnType<typeof getDb>, options: { days: string; json?: boolean }) {
  if (isDatabaseEmpty(db)) {
    showFirstRunGuidance();
    return;
  }

  const rows = db.prepare(`
    SELECT
      COALESCE(category, 'Uncategorized') as category,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
    WHERE date >= date('now', '-${parseInt(options.days)} days')
      AND amount < 0
    GROUP BY category
    ORDER BY total ASC
  `).all() as CategorySum[];

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const table = new Table({
    head: ['Category', 'Spent', 'Transactions'],
    colWidths: [25, 15, 15],
  });

  rows.forEach((row) => {
    table.push([
      row.category || 'Uncategorized',
      chalk.red(Math.abs(row.total).toFixed(2)),
      row.count.toString(),
    ]);
  });

  console.log(chalk.bold(`\nSpending by Category (last ${options.days} days)\n`));
  console.log(table.toString());
}

function showByMonth(db: ReturnType<typeof getDb>, options: { json?: boolean }) {
  if (isDatabaseEmpty(db)) {
    showFirstRunGuidance();
    return;
  }

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as expenses,
      SUM(amount) as net
    FROM transactions
    GROUP BY strftime('%Y-%m', date)
    ORDER BY month DESC
    LIMIT 12
  `).all() as MonthlySum[];

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  const table = new Table({
    head: ['Month', 'Income', 'Expenses', 'Net'],
    colWidths: [12, 15, 15, 15],
  });

  rows.forEach((row) => {
    const netColor = row.net >= 0 ? chalk.green : chalk.red;
    table.push([
      row.month,
      chalk.green(row.income.toFixed(2)),
      chalk.red(Math.abs(row.expenses).toFixed(2)),
      netColor(row.net.toFixed(2)),
    ]);
  });

  console.log(chalk.bold('\nMonthly Summary\n'));
  console.log(table.toString());
}

function showOverview(db: ReturnType<typeof getDb>, options: { days: string; json?: boolean }) {
  if (isDatabaseEmpty(db)) {
    showFirstRunGuidance();
    return;
  }

  const days = parseInt(options.days);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_transactions,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_expenses,
      SUM(amount) as net,
      AVG(CASE WHEN amount < 0 THEN amount ELSE NULL END) as avg_expense
    FROM transactions
    WHERE date >= date('now', '-${days} days')
  `).get() as {
    total_transactions: number;
    total_income: number;
    total_expenses: number;
    net: number;
    avg_expense: number;
  };

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(chalk.bold(`\nFinancial Overview (last ${days} days)\n`));
  console.log(`  Transactions:    ${stats.total_transactions}`);
  console.log(`  Income:          ${chalk.green('$' + stats.total_income.toFixed(2))}`);
  console.log(`  Expenses:        ${chalk.red('$' + Math.abs(stats.total_expenses).toFixed(2))}`);
  console.log(`  Net:             ${(stats.net >= 0 ? chalk.green : chalk.red)('$' + stats.net.toFixed(2))}`);
  console.log(`  Avg Expense:     ${chalk.yellow('$' + Math.abs(stats.avg_expense || 0).toFixed(2))}`);
}
