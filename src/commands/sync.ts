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
    console.log('Streaming results from Gemini in real-time. Please wait for completion.\n');
    console.log(chalk.cyan('═'.repeat(80)));
  }

  const spinner = ora({
    text: 'Connecting to Gemini...',
    spinner: 'dots',
    isEnabled: options.format !== false
  }).start();

  const startTime = Date.now();
  const timeout = parseInt(options.timeout || config.timeout.toString() || '60') * 1000;

  try {
    const result = await runGeminiWithTimeout(
      geminiPath,
      convertedQuery,
      options.model || config.model || '',
      timeout,
      (elapsed: number) => {
        if (elapsed === -1) {
          // Clear spinner when streaming starts
          spinner.stop();
          spinner.clear();
          if (options.format !== false) {
            console.log(chalk.green('\n▶ Streaming Gemini response:\n'));
          }
        } else {
          const progress = Math.floor((elapsed / timeout) * 100);
          spinner.text = `Waiting for Gemini... ${progress}% (${Math.floor(elapsed / 1000)}s/${timeout / 1000}s)`;
        }
      },
      options
    );

    if (options.format !== false) {
      // Don't show spinner success if we were streaming
      console.log(chalk.cyan('\n' + '═'.repeat(80)));
      console.log(chalk.green('\n✅ Analysis complete!\n'));
      console.log(chalk.yellow('Results have been streamed above. I can now see and use them.'));
    } else {
      // For non-formatted output, just print the result
      console.log(result);
    }
  } catch (error: any) {
    spinner.fail(chalk.red('Analysis failed'));
    console.error(chalk.red(`Error: ${error}`));
    
    // Provide helpful guidance for common errors
    if (error.toString().includes('429') || error.toString().includes('Quota exceeded')) {
      console.error(chalk.yellow('\nQuota exceeded. Gemini should have auto-switched models.'));
      console.error(chalk.cyan('If it didn\'t, try:'));
      console.error(chalk.gray('1. Set up a Gemini API key for higher quotas'));
      console.error(chalk.gray('2. Wait for daily quota reset'));
    }
    
    process.exit(1);
  }
}

function runGeminiWithTimeout(
  geminiPath: string,
  query: string,
  model: string,
  timeout: number,
  onProgress: (elapsed: number) => void,
  options: { format?: boolean }
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Add -y flag to accept all actions automatically (non-interactive)
    const args = ['-y'];
    
    // Only add model if specified (empty string means let gemini auto-select)
    if (model) {
      args.push('-m', model);
    }
    
    args.push('-p', query);
    
    const gemini = spawn(geminiPath, args, {
      env: { ...process.env },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Close stdin immediately since we're not sending any input
    gemini.stdin.end();

    let output = '';
    let error = '';
    let progressInterval: NodeJS.Timeout;
    let hasStartedStreaming = false;

    const startTime = Date.now();
    
    progressInterval = setInterval(() => {
      if (!hasStartedStreaming) {
        const elapsed = Date.now() - startTime;
        onProgress(elapsed);
      }
    }, 2000);

    const timeoutHandle = setTimeout(() => {
      clearInterval(progressInterval);
      gemini.kill('SIGTERM');
      reject(new Error(`Timeout after ${timeout / 1000} seconds`));
    }, timeout);

    gemini.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      
      // First data received - clear spinner and start streaming
      if (!hasStartedStreaming) {
        hasStartedStreaming = true;
        clearInterval(progressInterval);
        onProgress(-1); // Signal to clear spinner
      }
      
      // Stream output in real-time so Claude sees progress
      if (options.format !== false) {
        // Remove ANSI color codes for cleaner output
        const cleanChunk = chunk.replace(/\x1b\[[0-9;]*m/g, '');
        process.stdout.write(cleanChunk);
      }
    });

    gemini.stderr.on('data', (data) => {
      const errorData = data.toString();
      error += errorData;
      
      // Gemini might output some info to stderr that's not errors
      if (errorData.includes('[dotenv@')) {
        // This is just dotenv info, not an error
        return;
      }
      
      // Stream stderr info that might be useful (like model switching)
      if (options.format !== false) {
        if (errorData.includes('Slow response times detected') ||
            errorData.includes('switching from') ||
            errorData.includes('Automatically switching')) {
          // Clear any spinner first
          if (!hasStartedStreaming) {
            hasStartedStreaming = true;
            clearInterval(progressInterval);
            onProgress(-1);
          }
          console.log(chalk.yellow('\n⚡ ' + errorData.trim() + '\n'));
        }
      }
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