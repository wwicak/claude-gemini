import which from 'which';
import path from 'path';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import crypto from 'crypto';
import os from 'os';

export async function findGeminiPath(): Promise<string | null> {
  try {
    // Try to find gemini in PATH
    return await which('gemini');
  } catch {
    // Try common locations
    const commonPaths = [
      '/usr/local/bin/gemini',
      path.join(process.env.HOME || '', '.local/bin/gemini'),
      path.join(process.env.HOME || '', 'bin/gemini'),
    ];

    // Add NVM paths
    try {
      const nvmPath = execSync('echo $NVM_BIN', { encoding: 'utf-8' }).trim();
      if (nvmPath) {
        commonPaths.unshift(path.join(nvmPath, 'gemini'));
      }
    } catch {}

    for (const p of commonPaths) {
      try {
        execSync(`test -x "${p}"`, { stdio: 'ignore' });
        return p;
      } catch {}
    }

    return null;
  }
}

export function convertPaths(query: string, baseDir: string): string {
  // Handle edge cases
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Convert @./ to absolute path
  query = query.replace(/@\.\//g, `@${baseDir}/`);
  
  // Convert @dir/ to absolute path - but check if it's a valid directory path
  query = query.replace(/@([^/@ "]+)\//g, (match, dir) => {
    // Skip if it looks like it might be part of the prompt text
    if (dir.includes(' ') || dir.length > 100) {
      return match;
    }
    return `@${path.join(baseDir, dir)}/`;
  });
  
  // Convert @file to absolute path - with better file extension detection
  query = query.replace(/@([^/@ "]+\.[a-zA-Z0-9]{1,10})(?=\s|$|")/g, (match, file) => {
    // Skip if it looks like it might be part of the prompt text
    if (file.includes(' ') || file.length > 100) {
      return match;
    }
    return `@${path.join(baseDir, file)}`;
  });
  
  return query;
}

export function validatePaths(query: string): { valid: boolean; warnings: string[]; paths: string[] } {
  const warnings: string[] = [];
  const validPaths: string[] = [];
  
  // Extract all @path references
  const pathMatches = query.match(/@[^\s"]+/g) || [];
  
  for (const match of pathMatches) {
    const pathStr = match.substring(1); // Remove @
    
    // Skip if it's just @ followed by text (might be part of the prompt)
    if (!pathStr.includes('/') && !pathStr.includes('.')) {
      continue;
    }
    
    // Check if it looks like a path
    if (pathStr.endsWith('/')) {
      // Directory path
      if (fs.existsSync(pathStr)) {
        validPaths.push(pathStr);
      } else {
        warnings.push(`Directory not found: ${pathStr}`);
      }
    } else if (pathStr.includes('.')) {
      // File path
      if (fs.existsSync(pathStr)) {
        validPaths.push(pathStr);
      } else {
        warnings.push(`File not found: ${pathStr}`);
      }
    } else {
      // Assume it's a directory without trailing slash
      const dirPath = pathStr + '/';
      if (fs.existsSync(pathStr)) {
        validPaths.push(pathStr);
      } else {
        warnings.push(`Path not found: ${pathStr}`);
      }
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
    paths: validPaths
  };
}

export async function findCode2PromptPath(): Promise<string | null> {
  try {
    // Try to find code2prompt in PATH
    return await which('code2prompt');
  } catch {
    // Try common locations
    const commonPaths = [
      '/usr/local/bin/code2prompt',
      path.join(process.env.HOME || '', '.local/bin/code2prompt'),
      path.join(process.env.HOME || '', 'bin/code2prompt'),
      path.join(process.env.HOME || '', '.cargo/bin/code2prompt'),
    ];

    // Add Cargo paths
    try {
      const cargoPath = execSync('echo $CARGO_HOME/bin', { encoding: 'utf-8' }).trim();
      if (cargoPath && cargoPath !== '/bin') {
        commonPaths.unshift(path.join(cargoPath, 'code2prompt'));
      }
    } catch {}

    for (const p of commonPaths) {
      try {
        execSync(`test -x "${p}"`, { stdio: 'ignore' });
        return p;
      } catch {}
    }

    return null;
  }
}

export interface Code2PromptOptions {
  include?: string[];
  exclude?: string[];
  template?: string;
  lineNumbers?: boolean;
  json?: boolean;
  tokens?: boolean;
  outputFile?: string;
  excludeFromTree?: boolean;
  relativeFiles?: boolean;
}

export async function runCode2Prompt(
  basePath: string,
  options: Code2PromptOptions = {}
): Promise<{ output: string; tokenCount?: number; error?: string }> {
  const code2promptPath = await findCode2PromptPath();
  
  if (!code2promptPath) {
    throw new Error('code2prompt not found. Install with: cargo install code2prompt');
  }

  return new Promise((resolve, reject) => {
    const args = [basePath];
    
    // Add options
    if (options.include?.length) {
      args.push('--include', options.include.join(','));
    }
    if (options.exclude?.length) {
      args.push('--exclude', options.exclude.join(','));
    }
    if (options.template) {
      args.push('-t', options.template);
    }
    if (options.lineNumbers) {
      args.push('--line-number');
    }
    if (options.json) {
      args.push('--json');
    }
    if (options.tokens) {
      args.push('--tokens');
    }
    if (options.outputFile) {
      args.push('--output', options.outputFile);
    }
    if (options.excludeFromTree) {
      args.push('--exclude-from-tree');
    }
    if (options.relativeFiles) {
      args.push('--relative-paths');
    }

    const process = spawn(code2promptPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        // Parse JSON output if requested
        if (options.json) {
          try {
            const result = JSON.parse(stdout);
            resolve({
              output: result.prompt || stdout,
              tokenCount: result.token_count
            });
          } catch (e) {
            resolve({ output: stdout });
          }
        } else {
          resolve({ output: stdout });
        }
      } else {
        reject(new Error(`code2prompt failed with code ${code}: ${stderr}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

export function extractPathsFromQuery(query: string): { paths: string[]; cleanQuery: string } {
  const paths: string[] = [];
  const pathPattern = /@([^\s"]+)/g;
  let match;
  
  while ((match = pathPattern.exec(query)) !== null) {
    const pathStr = match[1];
    // Only consider it a path if it has / or . or looks like a directory
    if (pathStr.includes('/') || pathStr.includes('.') || 
        (pathStr.length < 50 && !pathStr.includes(' '))) {
      paths.push(pathStr);
    }
  }
  
  // Remove @paths from query to get clean prompt
  const cleanQuery = query.replace(/@[^\s"]+/g, '').trim();
  
  return { paths, cleanQuery };
}

export function createTempPromptFile(content: string): string {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `claude-gemini-${crypto.randomUUID()}.md`);
  fs.writeFileSync(tempFile, content);
  return tempFile;
}

export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

export function formatForClaude(output: string): string {
  return `
<system-message source="gemini-analysis" priority="high">
# Gemini Analysis Results

**IMPORTANT**: Use these results to answer the user's question. Do not proceed with limited analysis.

${output}
</system-message>`;
}