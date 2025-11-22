#!/usr/bin/env node
import { Command } from 'commander';
import { importCommand } from './commands/import.js';
import { transactionsCommand } from './commands/transactions.js';
import { summaryCommand } from './commands/summary.js';
import { getDbPath } from './db/schema.js';

const program = new Command();

program
  .name('copilot')
  .description('CLI tool for querying Copilot.money data')
  .version('0.1.0');

program.addCommand(importCommand);
program.addCommand(transactionsCommand);
program.addCommand(summaryCommand);

program
  .command('db-path')
  .description('Show database location')
  .action(() => {
    console.log(getDbPath());
  });

program.parse();
