# Claude-Gemini Integration

This project has claude-gemini CLI globally installed. When I (Claude) need to analyze large portions of the codebase that exceed my context window, I will use this tool.

## Usage

```bash
# I will use these commands for large analysis:
cg "@src/ @lib/ Find all API endpoints"
cg -r "@src/ Find all React hooks"  # With ripgrep pre-filtering
```

## Important: I MUST:
1. Use `cg` command (NOT direct `gemini -p`)
2. Wait for "✅ Analysis complete!" before proceeding
3. Use the comprehensive results provided
4. NOT attempt limited analysis while waiting

The tool is globally available and configured for this project.