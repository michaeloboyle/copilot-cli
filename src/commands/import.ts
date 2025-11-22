import { Command } from 'commander';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { getDb } from '../db/schema.js';
import { parseTransactionsCsv, importTransactions } from '../parsers/csv.js';

export const importCommand = new Command('import')
  .description('Import transactions from Copilot CSV export')
  .argument('<file>', 'Path to CSV file')
  .option('--dry-run', 'Preview import without saving')
  .action((file: string, options: { dryRun?: boolean }) => {
    if (!existsSync(file)) {
      console.error(chalk.red(`File not found: ${file}`));
      process.exit(1);
    }

    const transactions = parseTransactionsCsv(file);
    console.log(chalk.blue(`Parsed ${transactions.length} transactions from ${file}`));

    if (options.dryRun) {
      console.log(chalk.yellow('\nDry run - no changes made'));
      console.log('\nSample transactions:');
      transactions.slice(0, 5).forEach((tx) => {
        console.log(`  ${tx.date} | ${tx.description.slice(0, 30).padEnd(30)} | ${tx.amount.toFixed(2).padStart(10)}`);
      });
      return;
    }

    const db = getDb();
    const { imported, skipped } = importTransactions(db, transactions, file);
    db.close();

    console.log(chalk.green(`Imported: ${imported}`));
    if (skipped > 0) {
      console.log(chalk.yellow(`Skipped (duplicates): ${skipped}`));
    }
  });
