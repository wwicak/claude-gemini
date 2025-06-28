import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config';

interface ConfigOptions {
  list?: boolean;
  set?: string;
  global?: boolean;
}

export async function config(options: ConfigOptions) {
  if (options.list) {
    const config = await loadConfig();
    console.log(chalk.blue('Current configuration:'));
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (options.set) {
    const [key, value] = options.set.split('=');
    if (!key || value === undefined) {
      console.error(chalk.red('Invalid format. Use: --set key=value'));
      process.exit(1);
    }

    // Parse value type
    let parsedValue: any = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(Number(value))) parsedValue = Number(value);

    await saveConfig({ [key]: parsedValue }, options.global);
    console.log(chalk.green(`Set ${key} = ${parsedValue}`));
    
    if (options.global) {
      console.log(chalk.gray('(global configuration)'));
    } else {
      console.log(chalk.gray('(project configuration)'));
    }
    return;
  }

  // Show help if no options
  console.log(chalk.blue('Configuration management:'));
  console.log('  --list           Show current configuration');
  console.log('  --set key=value  Set a configuration value');
  console.log('  --global         Use global configuration');
  console.log('');
  console.log('Available keys:');
  console.log('  timeout     - Analysis timeout in seconds (default: 300)');
  console.log('  model       - Gemini model to use (default: gemini-2.5-flash)');
  console.log('  ripgrep     - Use ripgrep pre-filtering (default: true)');
  console.log('  format      - Format output for Claude (default: true)');
}