import { Command } from 'commander';
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { getDb } from '../db/schema.js';
import { parseTransactionsCsv, importTransactions } from '../parsers/csv.js';

const DOWNLOADS_DIR = join(homedir(), 'Downloads');

export const syncCommand = new Command('sync')
  .description('Export from Copilot and import in one step (macOS only)')
  .option('--shortcut <name>', 'Apple Shortcut name to run', 'Export Copilot')
  .option('--wait <seconds>', 'Seconds to wait for export', '10')
  .action(async (options: { shortcut: string; wait: string }) => {
    if (process.platform !== 'darwin') {
      console.error(chalk.red('Sync command is only available on macOS'));
      process.exit(1);
    }

    // Get CSV files before export
    const beforeFiles = getCsvFiles(DOWNLOADS_DIR);

    // Try to run shortcut
    console.log(chalk.blue(`Running Shortcut: "${options.shortcut}"...`));
    const shortcutWorked = runShortcut(options.shortcut);

    if (!shortcutWorked) {
      console.log(chalk.yellow('Shortcut not found.'));
      console.log(chalk.gray('Create an Apple Shortcut named "Export Copilot" that:'));
      console.log(chalk.gray('  1. Opens Copilot'));
      console.log(chalk.gray('  2. Exports data to Downloads'));
      console.log(chalk.gray('\nOr export manually and run: copilot import <file>'));
      return;
    }

    // Wait for export
    console.log(chalk.gray(`Waiting ${options.wait}s for export...`));
    await sleep(parseInt(options.wait) * 1000);

    // Find new CSV file
    const afterFiles = getCsvFiles(DOWNLOADS_DIR);
    const newFile = afterFiles.find(
      (f) =>
        !beforeFiles.some((b) => b.path === f.path) ||
        (Date.now() - f.mtime < 30000 && f.name.toLowerCase().includes('copilot'))
    );

    if (!newFile) {
      console.log(chalk.yellow('No new export found. Try increasing --wait or export manually.'));
      return;
    }

    console.log(chalk.green(`Found export: ${newFile.name}`));

    // Import
    const transactions = parseTransactionsCsv(newFile.path);
    console.log(chalk.blue(`Parsed ${transactions.length} transactions`));

    const db = getDb();
    const { imported, skipped } = importTransactions(db, transactions, newFile.path);
    db.close();

    console.log(chalk.green(`Imported: ${imported}`));
    if (skipped > 0) {
      console.log(chalk.yellow(`Skipped (duplicates): ${skipped}`));
    }
  });

function runShortcut(name: string): boolean {
  try {
    execSync(`shortcuts run "${name}"`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

interface CsvFile {
  name: string;
  path: string;
  mtime: number;
}

function getCsvFiles(dir: string): CsvFile[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.csv'))
    .map((name) => {
      const path = join(dir, name);
      const stat = statSync(path);
      return { name, path, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
