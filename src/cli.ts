#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { sync, watch, init, config, inject } from './commands';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = packageJson.version;

const program = new Command();

program
  .name('claude-gemini')
  .description('Global CLI for Claude-Gemini integration')
  .version(version)
  .alias('cg');

// Sync command - the main functionality
program
  .command('sync')
  .alias('s')
  .description('Run Gemini analysis synchronously')
  .argument('<query>', 'Query with @paths and prompt')
  .option('-r, --ripgrep', 'Use ripgrep for pre-filtering')
  .option('-t, --timeout <seconds>', 'Timeout in seconds', '300')
  .option('-m, --model <model>', 'Gemini model to use', 'gemini-2.0-flash-exp')
  .option('--no-format', 'Return raw output without formatting')
  .action(sync);

// Watch command
program
  .command('watch')
  .alias('w')
  .description('Watch for file changes and auto-analyze')
  .option('-p, --pattern <pattern>', 'File patterns to watch', '*.ts,*.tsx,*.js,*.jsx')
  .option('-d, --debounce <ms>', 'Debounce time in milliseconds', '2000')
  .action(watch);

// Init command - setup in current project
program
  .command('init')
  .description('Initialize Claude-Gemini in current project')
  .option('--global', 'Set up global configuration')
  .option('--inject', 'Inject instructions into existing CLAUDE.md')
  .action(init);

// Config command
program
  .command('config')
  .description('Manage Claude-Gemini configuration')
  .option('-l, --list', 'List current configuration')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-g, --global', 'Use global configuration')
  .action(config);

// Inject command - auto-inject into CLAUDE.md
program
  .command('inject')
  .description('Inject Claude-Gemini instructions into CLAUDE.md')
  .option('-f, --file <path>', 'Path to CLAUDE.md', './CLAUDE.md')
  .option('--force', 'Overwrite existing instructions')
  .action(inject);

// Global command handler for direct execution
program
  .argument('[query]', 'Direct query (shorthand for sync)')
  .action((query) => {
    if (query) {
      sync(query, { ripgrep: false, timeout: '300', model: 'gemini-2.0-flash-exp', format: true });
    } else {
      program.help();
    }
  });

program.parse();