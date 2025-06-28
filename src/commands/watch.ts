import chalk from 'chalk';
import chokidar from 'chokidar';
import { debounce } from '../utils/debounce';
import { sync } from './sync';
import { loadConfig } from '../config';

interface WatchOptions {
  pattern?: string;
  debounce?: string;
}

export async function watch(options: WatchOptions) {
  const config = await loadConfig();
  const patterns = options.pattern?.split(',') || config.watchPatterns || ['*.ts', '*.tsx', '*.js', '*.jsx'];
  const debounceTime = parseInt(options.debounce || '2000');

  console.log(chalk.blue('Starting file watcher...'));
  console.log(chalk.gray(`Watching patterns: ${patterns.join(', ')}`));
  console.log(chalk.gray(`Debounce: ${debounceTime}ms`));
  console.log(chalk.yellow('\nPress Ctrl+C to stop\n'));

  const watcher = chokidar.watch(patterns, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.claude-gemini/**'
    ],
    persistent: true,
    ignoreInitial: true
  });

  const runAnalysis = debounce(async (path: string) => {
    console.log(chalk.blue(`\nFile changed: ${path}`));
    console.log(chalk.yellow('Running analysis...\n'));
    
    // You can customize this query based on the changed file
    const query = `@${path} Analyze the recent changes and their impact`;
    
    try {
      await sync(query, { 
        ripgrep: config.ripgrep, 
        timeout: config.timeout.toString(),
        model: config.model,
        format: config.format
      });
    } catch (error) {
      console.error(chalk.red(`Analysis failed: ${error}`));
    }
  }, debounceTime);

  watcher
    .on('change', runAnalysis)
    .on('add', runAnalysis)
    .on('unlink', (path) => {
      console.log(chalk.red(`File deleted: ${path}`));
    })
    .on('error', (error) => {
      console.error(chalk.red(`Watcher error: ${error}`));
    });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nStopping file watcher...'));
    watcher.close();
    process.exit(0);
  });
}