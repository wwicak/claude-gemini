import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { findGeminiPath, convertPaths, formatForClaude } from '../utils';
import { loadConfig } from '../config';

interface SyncOptions {
  ripgrep?: boolean;
  timeout?: string;
  model?: string;
  format?: boolean;
}

export async function sync(query: string, options: SyncOptions) {
  const config = await loadConfig();
  const geminiPath = await findGeminiPath();
  
  if (!geminiPath) {
    console.error(chalk.red('Error: Gemini CLI not found. Please ensure it is installed.'));
    process.exit(1);
  }

  // Convert relative paths to absolute
  const convertedQuery = convertPaths(query, process.cwd());
  
  // Show Claude instructions
  if (options.format !== false) {
    console.log(chalk.yellow('\n# IMPORTANT: Gemini Analysis in Progress\n'));
    console.log('I am currently running a Gemini analysis for you. This may take 1-5 minutes.\n');
    console.log(chalk.bold('DO NOT PROCEED') + ' with alternative approaches.\n');
    console.log('Status indicators:');
    console.log('- 🔄 Analysis in progress...');
    console.log('- ✅ Analysis complete (results below)');
    console.log('- ❌ Analysis failed (fallback to limited analysis)\n');
  }

  const spinner = ora({
    text: 'Starting Gemini analysis...',
    spinner: 'dots'
  }).start();

  const startTime = Date.now();
  const timeout = parseInt(options.timeout || config.timeout.toString() || '300') * 1000;

  try {
    const result = await runGeminiWithTimeout(
      geminiPath,
      convertedQuery,
      options.model || config.model || 'gemini-2.0-flash-exp',
      timeout,
      (elapsed: number) => {
        const progress = Math.floor((elapsed / timeout) * 100);
        spinner.text = `Analysis in progress... ${progress}% (${Math.floor(elapsed / 1000)}s/${timeout / 1000}s)`;
      }
    );

    spinner.succeed(chalk.green('Analysis complete!'));
    
    if (options.format !== false) {
      console.log(formatForClaude(result));
    } else {
      console.log(result);
    }
  } catch (error) {
    spinner.fail(chalk.red('Analysis failed'));
    console.error(chalk.red(`Error: ${error}`));
    process.exit(1);
  }
}

function runGeminiWithTimeout(
  geminiPath: string,
  query: string,
  model: string,
  timeout: number,
  onProgress: (elapsed: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-m', model, '-p', query];
    const gemini = spawn(geminiPath, args, {
      env: { ...process.env },
      shell: false
    });

    let output = '';
    let error = '';
    let progressInterval: NodeJS.Timeout;

    const startTime = Date.now();
    
    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      onProgress(elapsed);
    }, 2000);

    const timeoutHandle = setTimeout(() => {
      clearInterval(progressInterval);
      gemini.kill('SIGTERM');
      reject(new Error(`Timeout after ${timeout / 1000} seconds`));
    }, timeout);

    gemini.stdout.on('data', (data) => {
      output += data.toString();
    });

    gemini.stderr.on('data', (data) => {
      error += data.toString();
    });

    gemini.on('close', (code) => {
      clearTimeout(timeoutHandle);
      clearInterval(progressInterval);
      
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Gemini exited with code ${code}: ${error}`));
      }
    });

    gemini.on('error', (err) => {
      clearTimeout(timeoutHandle);
      clearInterval(progressInterval);
      reject(err);
    });
  });
}