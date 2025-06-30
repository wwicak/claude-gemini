# Claude-Gemini Integration

This project uses the enhanced claude-gemini CLI with **code2prompt integration** for superior codebase analysis. As Claude, I must use this tool when:

1. Analyzing entire directories or multiple large files
2. The requested analysis would exceed my context window
3. You explicitly ask for comprehensive codebase analysis
4. Performing architecture, security, or pattern analysis

## Enhanced Capabilities

The CLI now includes:
- 🚀 **Code2Prompt Integration** - Intelligent codebase context generation
- 🎯 **Smart Analysis Detection** - Automatically optimizes analysis method
- 📊 **Token Optimization** - Efficient context packing with token counting
- 🔍 **Advanced Filtering** - Include/exclude patterns with .gitignore respect

## CRITICAL: Synchronous Execution

**IMPORTANT**: I MUST use the `claude-gemini` or `cg` command (NOT direct gemini):

```bash
# ✅ CORRECT - Waits for results
claude-gemini sync "@src/ @lib/ Find all API endpoints"
cg sync "@src/ @lib/ Find all API endpoints"
cg "@src/ @lib/ Find all API endpoints"  # Short form (defaults to sync)

# ❌ WRONG - May not wait for results
gemini -p "@src/ @lib/ Find all API endpoints"
```

## Usage Examples

```bash
# Enhanced codebase analysis (automatic code2prompt) - both forms work
cg sync "Analyze the project architecture"
cg "Review security patterns in the codebase"  # Short form

# Specific file/directory analysis
cg sync "@src/auth.ts @src/middleware.ts Analyze authentication flow"
cg "@src/ @lib/ Find all WebSocket implementations"

# Advanced filtering with code2prompt
cg sync "Audit authentication logic" --include "*.ts,*.js" --exclude "**/tests/**"

# Use ripgrep for targeted searches (legacy mode)
cg sync -r "@src/ Find all useState hooks"

# Custom analysis with line numbers
cg sync "Review API endpoints" --line-numbers

# Force legacy mode if needed
cg sync "@src/ Find endpoints" --no-code2prompt

# Analyze with timeout
cg sync -t 600 "@./ Comprehensive security audit"
```

## My Workflow (MUST FOLLOW):
1. **Detect analysis need**: Large codebases, architecture analysis, security audits
2. **Use enhanced command**: `cg sync` or `cg` (leverages code2prompt automatically)
3. **Wait for completion**: Look for "✅ Analysis complete!" message
4. **Watch for context**: Note "📊 Code context: X tokens" for comprehensive analysis
5. **Use comprehensive results**: Never proceed with limited analysis while waiting

## Smart Analysis Features

The tool now automatically:
- **Detects codebase analysis** from queries like "analyze", "architecture", "security"
- **Uses code2prompt** for intelligent context generation when available
- **Falls back gracefully** to legacy processing if code2prompt unavailable
- **Optimizes token usage** with smart filtering and exclusions

## Common Path Patterns
- `@./` - Current directory
- `@src/` - Source directory
- `@lib/` - Library directory
- `@app/` - App directory (Next.js)
- `@components/` - Components directory

## Error Handling
If I encounter a 400 error, it usually means:
1. The specified paths don't exist
2. I should check available directories first with `ls`
3. I should use `@./` or verify paths exist

The tool is globally available and configured for this project.