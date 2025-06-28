import which from 'which';
import path from 'path';
import { execSync } from 'child_process';

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
  // Convert @./ to absolute path
  query = query.replace(/@\.\//g, `@${baseDir}/`);
  
  // Convert @dir/ to absolute path
  query = query.replace(/@([^/@ ]+)\//g, (match, dir) => {
    return `@${path.join(baseDir, dir)}/`;
  });
  
  // Convert @file to absolute path
  query = query.replace(/@([^/@ ]+\.[a-zA-Z0-9]+)/g, (match, file) => {
    return `@${path.join(baseDir, file)}`;
  });
  
  return query;
}

export function formatForClaude(output: string): string {
  return `
<system-message source="gemini-analysis" priority="high">
# Gemini Analysis Results

**IMPORTANT**: Use these results to answer the user's question. Do not proceed with limited analysis.

${output}
</system-message>`;
}