#!/usr/bin/env node

import chalk from 'chalk';
import { execSync } from 'child_process';

// Post-install setup script
console.log(chalk.blue('\n🚀 Setting up Claude-Gemini CLI...\n'));

try {
  // Check if gemini is installed
  execSync('which gemini', { stdio: 'ignore' });
  console.log(chalk.green('✅ Gemini CLI found'));
} catch {
  console.log(chalk.yellow('⚠️  Gemini CLI not found in PATH'));
  console.log(chalk.gray('   Please ensure Gemini CLI is installed'));
}

console.log(chalk.green('\n✅ Claude-Gemini CLI installed successfully!'));
console.log(chalk.blue('\nQuick start:'));
console.log(chalk.gray('  1. Initialize in your project: ') + chalk.cyan('cg init'));
console.log(chalk.gray('  2. Test the integration: ') + chalk.cyan('cg "@package.json What is this?"'));
console.log(chalk.gray('  3. See all commands: ') + chalk.cyan('cg --help'));
console.log('');