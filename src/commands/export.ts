import { Command } from 'commander';
import { execSync, spawn } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

const DOWNLOADS_DIR = join(homedir(), 'Downloads');

export const exportCommand = new Command('export')
  .description('Trigger CSV export from Copilot.money app (macOS only)')
  .option('--shortcut <name>', 'Apple Shortcut name to run', 'Export Copilot')
  .option('--wait <seconds>', 'Seconds to wait for export', '10')
  .option('--no-import', 'Skip automatic import after export')
  .action(async (options: { shortcut: string; wait: string; import: boolean }) => {
    // Check if macOS
    if (process.platform !== 'darwin') {
      console.error(chalk.red('Export command is only available on macOS'));
      process.exit(1);
    }

    // Try Apple Shortcut first
    console.log(chalk.blue(`Running Shortcut: "${options.shortcut}"...`));

    try {
      // Get list of CSV files in Downloads before export
      const beforeFiles = getCsvFiles(DOWNLOADS_DIR);

      // Run the shortcut
      const shortcutResult = runShortcut(options.shortcut);

      if (!shortcutResult) {
        // Shortcut doesn't exist, try AppleScript fallback
        console.log(chalk.yellow('Shortcut not found. Trying AppleScript...'));
        runAppleScript();
      }

      // Wait for export
      console.log(chalk.gray(`Waiting ${options.wait}s for export...`));
      await sleep(parseInt(options.wait) * 1000);

      // Find new CSV file
      const afterFiles = getCsvFiles(DOWNLOADS_DIR);
      const newFiles = afterFiles.filter(
        (f) => !beforeFiles.some((b) => b.path === f.path)
      );

      if (newFiles.length === 0) {
        // Check for recently modified files
        const recentFile = afterFiles.find(
          (f) => Date.now() - f.mtime < 30000 && f.name.toLowerCase().includes('copilot')
        );

        if (recentFile) {
          console.log(chalk.green(`Found export: ${recentFile.name}`));
          if (options.import) {
            console.log(chalk.blue('Run import with:'));
            console.log(chalk.cyan(`  copilot import "${recentFile.path}"`));
          }
        } else {
          console.log(chalk.yellow('No new CSV files found in Downloads.'));
          console.log(chalk.gray('Manual export: Copilot → Settings → Account → Export'));
        }
        return;
      }

      const exportedFile = newFiles[0];
      console.log(chalk.green(`Export complete: ${exportedFile.name}`));

      if (options.import) {
        console.log(chalk.blue('\nTo import:'));
        console.log(chalk.cyan(`  copilot import "${exportedFile.path}"`));
      }
    } catch (error) {
      console.error(chalk.red('Export failed:'), error);
      console.log(chalk.gray('\nManual export: Copilot → Settings → Account → Export'));
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

function runAppleScript(): void {
  const script = `
    tell application "Copilot"
      activate
    end tell

    delay 1

    tell application "System Events"
      tell process "Copilot"
        -- Try to open settings/export
        keystroke "," using command down
        delay 0.5
      end tell
    end tell
  `;

  try {
    execSync(`osascript -e '${script}'`, { stdio: 'pipe' });
    console.log(chalk.yellow('Opened Copilot settings. Please manually click Export.'));
  } catch {
    console.log(chalk.yellow('Could not automate Copilot. Please export manually.'));
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
