import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

interface InjectOptions {
  file?: string;
  force?: boolean;
}

const CLAUDE_INSTRUCTIONS = `
## Claude-Gemini Integration

This project uses the claude-gemini CLI for analyzing large codebases. As Claude, I must use this tool when:

1. Analyzing entire directories or multiple large files
2. The requested analysis would exceed my context window
3. You explicitly ask for comprehensive codebase analysis

### CRITICAL: Synchronous Execution

**IMPORTANT**: I MUST use the \`claude-gemini\` or \`cg\` command (NOT direct gemini):

\`\`\`bash
# ✅ CORRECT - Waits for results
claude-gemini "@src/ @lib/ Find all API endpoints"
cg "@src/ @lib/ Find all API endpoints"

# ❌ WRONG - May not wait for results
gemini -p "@src/ @lib/ Find all API endpoints"
\`\`\`

### Usage Examples

\`\`\`bash
# Analyze specific files
cg "@src/auth.ts @src/middleware.ts Analyze authentication flow"

# Analyze entire directories
cg "@src/ @lib/ Find all WebSocket implementations"

# Use ripgrep for targeted searches
cg -r "@src/ Find all useState hooks"

# Analyze with specific timeout
cg -t 600 "@./ Comprehensive security audit"
\`\`\`

### My Workflow (MUST FOLLOW):
1. Detect when large analysis is needed
2. Use \`cg\` command (NOT direct gemini)
3. Wait for "✅ Analysis complete!" message
4. Use the comprehensive results
5. Do NOT proceed with limited analysis while waiting
`;

export async function inject(options: InjectOptions) {
  const filePath = path.resolve(options.file || './CLAUDE.md');
  
  try {
    if (!await fs.pathExists(filePath)) {
      console.error(chalk.red(`File not found: ${filePath}`));
      console.log(chalk.yellow('Tip: Run "cg init" to create CLAUDE.md'));
      process.exit(1);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    
    // Check if already injected
    if (content.includes('claude-gemini') || content.includes('Claude-Gemini')) {
      if (!options.force) {
        console.log(chalk.yellow('Claude-Gemini instructions already present in file.'));
        console.log(chalk.gray('Use --force to overwrite'));
        return;
      }
    }

    // Find injection point or append
    const lines = content.split('\n');
    let injected = false;

    // Try to find a good section
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^#{1,2}\s+(Tools|Commands|Development|Analysis)/i)) {
        // Insert after this section
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== '' && !lines[j].match(/^#{1,2}\s+/)) {
          j++;
        }
        lines.splice(j, 0, CLAUDE_INSTRUCTIONS);
        injected = true;
        break;
      }
    }

    if (!injected) {
      // Append at the end
      lines.push('', CLAUDE_INSTRUCTIONS);
    }

    await fs.writeFile(filePath, lines.join('\n'));
    console.log(chalk.green(`✅ Injected Claude-Gemini instructions into ${filePath}`));
    
  } catch (error) {
    console.error(chalk.red(`Failed to inject: ${error}`));
    process.exit(1);
  }
}