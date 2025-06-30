# Claude-Gemini Integration

This project uses the claude-gemini CLI for analyzing large codebases. As Claude, I must use this tool when:

1. Analyzing entire directories or multiple large files
2. The requested analysis would exceed my context window
3. You explicitly ask for comprehensive codebase analysis

## CRITICAL: Synchronous Execution

**IMPORTANT**: I MUST use the `claude-gemini` or `cg` command (NOT direct gemini):

```bash
# ✅ CORRECT - Waits for results
claude-gemini "@src/ @lib/ Find all API endpoints"
cg "@src/ @lib/ Find all API endpoints"

# ❌ WRONG - May not wait for results
gemini -p "@src/ @lib/ Find all API endpoints"
```

## Usage Examples

```bash
# Analyze specific files
cg "@src/auth.ts @src/middleware.ts Analyze authentication flow"

# Analyze entire directories
cg "@src/ @lib/ Find all WebSocket implementations"

# Use ripgrep for targeted searches
cg -r "@src/ Find all useState hooks"

# Analyze with specific timeout
cg -t 600 "@./ Comprehensive security audit"
```

## My Workflow (MUST FOLLOW):
1. Detect when large analysis is needed
2. Use `cg` command (NOT direct gemini)
3. Wait for "✅ Analysis complete!" message
4. Use the comprehensive results
5. Do NOT proceed with limited analysis while waiting

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