import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { 
  findGeminiPath, 
  convertPaths, 
  formatForClaude, 
  validatePaths, 
  findCode2PromptPath,
  runCode2Prompt,
  extractPathsFromQuery,
  createTempPromptFile,
  cleanupTempFile
} from '../utils';
import { loadConfig } from '../config';
import path from 'path';

interface SyncOptions {
  ripgrep?: boolean;
  timeout?: string;
  model?: string;
  format?: boolean;
  useCode2prompt?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  lineNumbers?: boolean;
  template?: string;
}

export async function sync(query: string, options: SyncOptions) {
  // Validate input
  if (!query || typeof query !== 'string') {
    console.error(chalk.red('Error: Invalid query provided. Please provide a valid query string.'));
    process.exit(1);
  }
  
  const config = await loadConfig();
  const geminiPath = await findGeminiPath();
  
  if (!geminiPath) {
    console.error(chalk.red('Error: Gemini CLI not found. Please ensure it is installed.'));
    console.error(chalk.yellow('\nInstall with: npm install -g gemini'));
    process.exit(1);
  }
  
  // Attempt to use code2prompt for codebase analysis by default
  let processedQuery = query;
  let tempPromptFile: string | null = null;
  let usedCode2Prompt = false;
  
  if (options.useCode2prompt && await hasCodebaseContent(query)) {
    try {
      const code2promptResult = await processWithCode2Prompt(query, options);
      processedQuery = code2promptResult.processedQuery;
      tempPromptFile = code2promptResult.tempFile;
      usedCode2Prompt = true;
      
      if (options.format !== false) {
        console.log(chalk.cyan('🔄 Using code2prompt for enhanced codebase analysis...'));
        if (code2promptResult.tokenCount) {
          console.log(chalk.gray(`📊 Code context: ${code2promptResult.tokenCount} tokens`));
        }
      }
    } catch (error: any) {
      if (options.format !== false) {
        console.warn(chalk.yellow(`⚠️  code2prompt unavailable: ${error.message}`));
        console.warn(chalk.gray('Falling back to standard path processing...'));
      }
      // Fall through to legacy processing
    }
  }

  // Convert relative paths to absolute (only if not using code2prompt)
  const convertedQuery = usedCode2Prompt ? processedQuery : convertPaths(query, process.cwd());
  
  // Validate the converted query
  if (!convertedQuery) {
    console.error(chalk.red('Error: Failed to process the query. Please check your input.'));
    if (tempPromptFile) cleanupTempFile(tempPromptFile);
    process.exit(1);
  }
  
  // Validate paths exist (but only warn, don't block)
  const pathValidation = validatePaths(convertedQuery);
  if (!pathValidation.valid && pathValidation.warnings.length > 0) {
    console.warn(chalk.yellow('\n⚠️  Path warnings:'));
    pathValidation.warnings.forEach(warning => {
      console.warn(chalk.gray(`   - ${warning}`));
    });
    console.warn(chalk.cyan('\nTip: Use @./ for current directory or check that paths exist with ls\n'));
  }
  
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
  
  // Model fallback chain
  const modelFallbackChain = [
    options.model || config.model || '',  // User specified or empty (let Gemini decide)
    'gemini-2.5-flash',                   // New frontier flash model
    'gemini-2.0-flash-exp',               // Fast experimental model
    'gemini-1.5-flash',                   // Stable flash model
    'gemini-1.5-flash-8b'                 // Lightweight model
  ].filter((m, i, arr) => arr.indexOf(m) === i); // Remove duplicates

  let lastError: any;
  
  for (let i = 0; i < modelFallbackChain.length; i++) {
    const currentModel = modelFallbackChain[i];
    
    if (i > 0 && options.format !== false) {
      spinner.stop();
      console.log(chalk.yellow(`\n⚡ Retrying with model: ${currentModel || 'auto-select'}\n`));
      spinner.start();
    }
    
    try {
      const result = await runGeminiWithTimeout(
        geminiPath,
        convertedQuery,
        currentModel,
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
        
        // Cleanup temp files
        if (tempPromptFile) {
          cleanupTempFile(tempPromptFile);
        }
      } else {
        // For non-formatted output, just print the result
        console.log(result);
      }
      
      return; // Success, exit the function
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a quota error and we have more models to try
      if ((error.toString().includes('429') || error.toString().includes('Quota exceeded')) 
          && i < modelFallbackChain.length - 1) {
        continue; // Try next model
      }
      
      // Otherwise, break and handle the error
      break;
    }
  }
  
  // If we get here, all attempts failed
  spinner.fail(chalk.red('Analysis failed'));
  console.error(chalk.red(`Error: ${lastError}`));
    
    // Provide helpful guidance for common errors
    if (lastError.toString().includes('429') || lastError.toString().includes('Quota exceeded')) {
      console.error(chalk.yellow('\nQuota exceeded. Gemini should have auto-switched models.'));
      console.error(chalk.cyan('If it didn\'t, try:'));
      console.error(chalk.gray('1. Set up a Gemini API key for higher quotas'));
      console.error(chalk.gray('2. Wait for daily quota reset'));
    } else if (lastError.toString().includes('400') || lastError.toString().includes('Bad Request') || lastError.toString().includes('invalid argument')) {
      console.error(chalk.yellow('\nBad Request Error. Common causes:'));
      console.error(chalk.gray('1. Non-existent file paths (e.g., @app/, @lib/ when these don\'t exist)'));
      console.error(chalk.gray('2. Incorrectly formatted query'));
      console.error(chalk.gray('3. Special characters that need escaping'));
      console.error(chalk.cyan('\nTips:'));
      console.error(chalk.gray('1. Use @src/ or @./ for the current directory'));
      console.error(chalk.gray('2. Ensure paths exist: ls -la'));
      console.error(chalk.gray('3. Try simpler queries first'));
      console.error(chalk.gray('4. Enable debug: CG_DEBUG=1 cg "your query"'));
    } else if (lastError.toString().includes('Timeout')) {
      console.error(chalk.yellow('\nThe Gemini CLI is not responding. This could be due to:'));
      console.error(chalk.gray('1. Network connectivity issues'));
      console.error(chalk.gray('2. Gemini API server problems'));
      console.error(chalk.gray('3. Authentication issues'));
      console.error(chalk.cyan('\nTroubleshooting steps:'));
      console.error(chalk.gray('1. Try running gemini directly: gemini -p "test"'));
      console.error(chalk.gray('2. Check if you\'re logged in: gemini auth status'));
      console.error(chalk.gray('3. Enable debug mode: CG_DEBUG=1 cg "@package.json test"'));
    }
    
    // Cleanup temp files on error
    if (tempPromptFile) {
      cleanupTempFile(tempPromptFile);
    }
    
    process.exit(1);
}

async function hasCodebaseContent(query: string): Promise<boolean> {
  // Check if the query contains any @path references or file/directory indicators
  const { paths } = extractPathsFromQuery(query);
  
  // Always try code2prompt if there are any paths mentioned
  if (paths.length > 0) {
    // Check if code2prompt is available
    const code2promptPath = await findCode2PromptPath();
    return code2promptPath !== null;
  }
  
  // Also use code2prompt for codebase analysis keywords even without explicit paths
  const analysisKeywords = [
    'analyze', 'architecture', 'structure', 'codebase', 'project', 'code',
    'patterns', 'security', 'audit', 'review', 'overview', 'summary', 'files'
  ];
  
  const hasAnalysisKeywords = analysisKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
  
  if (hasAnalysisKeywords) {
    const code2promptPath = await findCode2PromptPath();
    return code2promptPath !== null;
  }
  
  return false;
}

async function processWithCode2Prompt(
  query: string, 
  options: SyncOptions
): Promise<{ processedQuery: string; tempFile: string | null; tokenCount?: number }> {
  const { paths, cleanQuery } = extractPathsFromQuery(query);
  
  // If no explicit paths, use current directory for codebase analysis
  let targetPaths = paths;
  if (paths.length === 0) {
    targetPaths = ['.'];
  }
  
  // Find the primary path (first directory or current dir if only files)
  let primaryPath = process.cwd();
  const dirPaths = targetPaths.filter(p => p.endsWith('/') || !p.includes('.'));
  if (dirPaths.length > 0) {
    primaryPath = path.resolve(dirPaths[0]);
  } else if (targetPaths.length > 0 && targetPaths[0] !== '.') {
    primaryPath = path.dirname(path.resolve(targetPaths[0]));
  }
  
  // Configure code2prompt options
  const code2promptOptions = {
    include: options.includePatterns || [],
    exclude: options.excludePatterns || [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.log',
      '.env*'
    ],
    lineNumbers: options.lineNumbers || false,
    template: options.template,
    json: true,
    tokens: true,
    excludeFromTree: true
  };
  
  // If specific files are mentioned, include them
  const fileIncludes = targetPaths
    .filter(p => p.includes('.') && !p.endsWith('/') && p !== '.')
    .map(p => path.basename(p))
    .filter(f => f.length > 0);
  
  if (fileIncludes.length > 0) {
    code2promptOptions.include = [...code2promptOptions.include, ...fileIncludes];
  }
  
  // Run code2prompt
  const result = await runCode2Prompt(primaryPath, code2promptOptions);
  
  // Create a comprehensive prompt
  const enhancedPrompt = `${cleanQuery}\n\n# Codebase Context\n\n${result.output}`;
  
  // Save to temp file for gemini
  const tempFile = createTempPromptFile(enhancedPrompt);
  
  // Return the file path as the query (gemini can read files with @)
  return {
    processedQuery: `@${tempFile} ${cleanQuery}`,
    tempFile,
    tokenCount: result.tokenCount
  };
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
    
    // Only add model if specified and not empty
    if (model && model.trim() !== '') {
      args.push('-m', model);
    }
    
    args.push('-p', query);
    
    // Add debug logging
    if (process.env.DEBUG || process.env.CG_DEBUG) {
      console.error(chalk.gray(`[DEBUG] Running: ${geminiPath} ${args.join(' ')}`));
      console.error(chalk.gray(`[DEBUG] Working directory: ${process.cwd()}`));
    }
    
    const gemini = spawn(geminiPath, args, {
      env: { ...process.env },
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      // Kill the process group on timeout
      detached: process.platform !== 'win32'
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
      
      // Try graceful shutdown first
      gemini.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        try {
          // Kill the entire process group
          if (process.platform !== 'win32' && gemini.pid) {
            process.kill(-gemini.pid, 'SIGKILL');
          } else {
            gemini.kill('SIGKILL');
          }
        } catch (e) {
          // Process might already be dead
        }
      }, 5000);
      
      reject(new Error(`Timeout after ${timeout / 1000} seconds. The Gemini CLI appears to be hanging.`));
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
      
      // Debug mode: show all stderr
      if (process.env.DEBUG || process.env.CG_DEBUG) {
        console.error(chalk.gray(`[DEBUG] stderr: ${errorData}`));
      }
    });

    gemini.on('close', (code) => {
      clearTimeout(timeoutHandle);
      clearInterval(progressInterval);
      
      if (code === 0) {
        resolve(output);
      } else {
        // Extract the actual error message if it's a quota error
        const quotaMatch = error.match(/Quota exceeded.*?\./g);
        if (quotaMatch) {
          reject(new Error(`429: ${quotaMatch[0]}`));
        } else if (error.includes('400') || error.includes('Bad Request') || error.includes('invalid argument')) {
          // Handle 400 errors specifically
          const errorMsg = `Invalid request: ${error}\n\nThis often happens when:\n1. File paths don't exist\n2. Query format is incorrect\n3. Special characters aren't properly escaped`;
          reject(new Error(errorMsg));
        } else {
          reject(new Error(`Gemini exited with code ${code}: ${error}`));
        }
      }
    });

    gemini.on('error', (err) => {
      clearTimeout(timeoutHandle);
      clearInterval(progressInterval);
      reject(err);
    });
  });
}