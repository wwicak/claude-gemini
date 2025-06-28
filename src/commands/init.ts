import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import ora from 'ora';

interface InitOptions {
  global?: boolean;
  inject?: boolean;
}

const CLAUDE_MD_TEMPLATE = `# Using Claude-Gemini CLI

This project uses the claude-gemini CLI for large codebase analysis. When analyzing files that exceed my context limits, I will automatically use this tool.

## Quick Reference

\`\`\`bash
# Analyze files/directories
claude-gemini "@src/ @lib/ Find all API endpoints"

# Short alias
cg "@src/ Analyze authentication implementation"

# With ripgrep pre-filtering
cg -r "@src/ Find all useState hooks"
\`\`\`

## Important for Claude

When I detect that a task requires analyzing large portions of the codebase, I MUST:
1. Use \`claude-gemini\` or \`cg\` command (NOT direct gemini)
2. Wait for "✅ Analysis complete!" message
3. Use the comprehensive results to answer your question
4. NOT proceed with limited analysis while waiting

The tool is globally installed and available in all your projects.
`;

export async function init(options: InitOptions) {
  const spinner = ora('Initializing Claude-Gemini...').start();

  try {
    const configDir = options.global 
      ? path.join(process.env.HOME || '', '.claude-gemini')
      : path.join(process.cwd(), '.claude-gemini');

    // Create config directory
    await fs.ensureDir(configDir);

    // Create default config
    const configPath = path.join(configDir, 'config.json');
    if (!await fs.pathExists(configPath)) {
      await fs.writeJson(configPath, {
        timeout: 300,
        model: 'gemini-2.0-flash-exp',
        ripgrep: true,
        format: true
      }, { spaces: 2 });
      spinner.text = 'Created configuration file';
    }

    // Handle CLAUDE.md injection
    if (options.inject || !options.global) {
      const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
      
      if (await fs.pathExists(claudeMdPath)) {
        // Inject into existing file
        await injectIntoClaudeMd(claudeMdPath);
        spinner.text = 'Updated CLAUDE.md with Claude-Gemini instructions';
      } else {
        // Create new CLAUDE.md
        await fs.writeFile(claudeMdPath, CLAUDE_MD_TEMPLATE);
        spinner.text = 'Created CLAUDE.md with Claude-Gemini instructions';
      }
    }

    // Create .gitignore entry
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf-8');
      if (!gitignore.includes('.claude-gemini/')) {
        await fs.appendFile(gitignorePath, '\n# Claude-Gemini\n.claude-gemini/\n');
        spinner.text = 'Added .claude-gemini to .gitignore';
      }
    }

    spinner.succeed(chalk.green('Claude-Gemini initialized successfully!'));
    
    console.log('\n' + chalk.blue('Next steps:'));
    console.log('1. Test the integration: ' + chalk.cyan('cg "@package.json What dependencies are used?"'));
    console.log('2. Configure settings: ' + chalk.cyan('cg config -l'));
    console.log('3. Set up watch mode: ' + chalk.cyan('cg watch'));
    
  } catch (error) {
    spinner.fail(chalk.red('Initialization failed'));
    console.error(error);
    process.exit(1);
  }
}

async function injectIntoClaudeMd(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Check if already has claude-gemini section
  if (content.includes('claude-gemini') || content.includes('Claude-Gemini')) {
    return; // Already injected
  }

  // Find a good injection point
  const lines = content.split('\n');
  let injectIndex = -1;

  // Look for sections about tools or analysis
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+(Tools|Analysis|Commands|Development)/i)) {
      injectIndex = i;
      break;
    }
  }

  // If no suitable section found, add at the beginning after the title
  if (injectIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('# ') && i > 0) {
        injectIndex = i + 1;
        break;
      }
    }
  }

  // Default to line 2 if still not found
  if (injectIndex === -1) {
    injectIndex = 2;
  }

  // Inject the content
  lines.splice(injectIndex, 0, '', CLAUDE_MD_TEMPLATE, '');
  await fs.writeFile(filePath, lines.join('\n'));
}