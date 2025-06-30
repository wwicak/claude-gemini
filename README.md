# Claude-Gemini CLI

A robust, global CLI tool for seamless integration between Claude and Gemini across all your projects.

## Features

- 🌍 **Global Installation** - One installation, works everywhere
- 🔄 **Synchronous Execution** - Ensures Claude waits for Gemini results
- 🚀 **Code2Prompt Integration** - Enhanced codebase analysis with intelligent context generation
- 📁 **Smart Path Resolution** - Automatic conversion of relative paths
- 🔍 **Ripgrep Integration** - Pre-filter large codebases for faster analysis
- ⚙️ **Project Configuration** - Customize settings per project
- 📝 **Auto-injection** - Automatically updates CLAUDE.md files
- 👀 **Watch Mode** - Monitor file changes and auto-analyze
- 🔄 **Automatic Model Fallback** - Seamlessly handles quota limits
- 🎯 **Smart Analysis Detection** - Automatically uses optimal analysis method based on query

## Installation

### Prerequisites
- Node.js 16+ 
- [Gemini CLI](https://github.com/google-gemini/gemini-cli): `npm install -g gemini`
- [code2prompt](https://github.com/mufeedvh/code2prompt) (optional but recommended): `cargo install code2prompt` or `brew install code2prompt`

### Method 1: npm (Recommended)
```bash
npm install -g claude-gemini
```

### Method 2: From Source
```bash
git clone https://github.com/claude-gemini/claude-gemini-cli.git
cd claude-gemini-cli
npm install
npm run build
npm link
```

### Method 3: Quick Install
```bash
curl -fsSL https://raw.githubusercontent.com/claude-gemini/claude-gemini-cli/main/install.sh | bash
```

## Quick Start

1. **Initialize in your project:**
   ```bash
   cd your-project
   cg init
   ```

2. **Test the integration:**
   ```bash
   cg "@package.json What dependencies are used?"
   ```

3. **Use in any project:**
   ```bash
   # Long form
   claude-gemini "@src/ @lib/ Find all API endpoints"
   
   # Short alias
   cg "@src/ Analyze authentication implementation"
   
   # With options
   cg -r -t 600 "@./ Comprehensive security audit"
   ```

## Commands

### `sync` (default)
Run Gemini analysis synchronously with intelligent codebase processing.

```bash
# Automatic codebase analysis (uses code2prompt by default)
cg "Analyze the project architecture"
cg "@src/ Find all WebSocket implementations"
cg sync "@src/ Find all WebSocket implementations"  # Explicit sync
```

Options:
- `-r, --ripgrep` - Use ripgrep for pre-filtering
- `-t, --timeout <seconds>` - Analysis timeout (default: 300)
- `-m, --model <model>` - Gemini model (empty = auto-select, starts with Pro)
- `--no-format` - Return raw output
- `--no-code2prompt` - Disable code2prompt and use legacy path processing
- `--include <patterns>` - Include file patterns (comma-separated)
- `--exclude <patterns>` - Exclude file patterns (comma-separated) 
- `--line-numbers` - Add line numbers to code blocks
- `--template <file>` - Use custom code2prompt template

The tool automatically handles model fallback when quota limits are reached:
1. Your specified model (or Gemini's auto-selection)
2. gemini-2.0-flash-exp
3. gemini-1.5-flash
4. gemini-1.5-flash-8b

### `init`
Initialize Claude-Gemini in current project.

```bash
cg init
cg init --global  # Set up global configuration
cg init --inject  # Only inject into existing CLAUDE.md
```

### `config`
Manage configuration settings.

```bash
cg config -l                    # List current config
cg config -s timeout=600        # Set project config
cg config -s model=gemini-2.0-pro --global  # Set global config
```

### `inject`
Inject instructions into CLAUDE.md.

```bash
cg inject                      # Inject into ./CLAUDE.md
cg inject -f ../CLAUDE.md      # Specific file
cg inject --force              # Overwrite existing
```

### `watch`
Watch files and auto-analyze on changes.

```bash
cg watch
cg watch -p "*.py,*.md" -d 5000  # Custom patterns and debounce
```

## Configuration

Configuration is loaded in this order (later overrides earlier):
1. Global config: `~/.claude-gemini/config.json`
2. Project config: `./.claude-gemini/config.json`
3. Project root: `./.claude-gemini.json`

### Configuration Options

```json
{
  "timeout": 300,              // Analysis timeout in seconds
  "model": "gemini-2.0-flash-exp",  // Gemini model
  "ripgrep": true,            // Use ripgrep pre-filtering
  "format": true,             // Format output for Claude
  "watchPatterns": ["*.ts", "*.tsx", "*.js", "*.jsx"]
}
```

## Project Structure

```
your-project/
├── CLAUDE.md              # Auto-updated with instructions
├── .claude-gemini.json    # Project-specific config (optional)
└── .claude-gemini/        # Project cache and config (git-ignored)
    └── config.json
```

## For Claude Users

Once installed, Claude will automatically use this tool when analyzing large codebases. The tool ensures:

1. Claude waits for analysis completion
2. Progress indicators show analysis status
3. Results are properly formatted
4. No proceeding with limited analysis

## Code2Prompt Integration

The CLI now uses [code2prompt](https://github.com/mufeedvh/code2prompt) by default for superior codebase analysis. This provides:

- **Intelligent Context Generation** - Automatically structures code for LLM consumption
- **Smart Filtering** - Respects .gitignore and excludes irrelevant files
- **Token Optimization** - Efficient context packing with token counting
- **Template Support** - Custom formatting for specific analysis needs

### Automatic Detection
The tool automatically uses code2prompt when:
- Analyzing codebase architecture, structure, or patterns
- Processing directories with `@path/` syntax
- Using analysis keywords (analyze, architecture, structure, etc.)

### Manual Control
```bash
# Force legacy mode (disable code2prompt)
cg "@src/ Find API endpoints" --no-code2prompt

# Custom filtering with code2prompt
cg "Analyze security patterns" --include "*.ts,*.js" --exclude "**/tests/**" 

# Add line numbers to code analysis
cg "Review authentication logic" --line-numbers

# Use custom code2prompt template
cg "Document the API" --template ./templates/api-docs.hbs
```

## Advanced Usage

### Custom Ripgrep Patterns
```bash
# Find specific patterns efficiently
cg -r "@src/ Find all 'TODO' comments"
cg -r "@lib/ Search for 'deprecated' methods"
```

### Multiple Projects
```bash
# Set project-specific timeouts
cd project1 && cg config -s timeout=600
cd project2 && cg config -s timeout=300

# Use different models per project
cg config -s model=gemini-2.0-pro
```

### CI/CD Integration
```bash
# In your CI pipeline
cg "@src/ @tests/ Verify test coverage" --no-format > analysis.txt
```

## Troubleshooting

### Gemini not found
```bash
# Check if Gemini is in PATH
which gemini

# If using nvm, ensure it's loaded
source ~/.nvm/nvm.sh
```

### Code2prompt not found
If you see "code2prompt unavailable" warnings:

```bash
# Install via Cargo (Rust)
cargo install code2prompt

# Install via Homebrew (macOS/Linux)
brew install code2prompt

# Verify installation
which code2prompt
code2prompt --help
```

The tool will automatically fall back to legacy processing if code2prompt is unavailable.

### Quota exceeded (429 error)
The tool now automatically handles quota limits by falling back to alternative models. If all models fail:

1. **Set up a Gemini API key** for higher quotas:
   ```bash
   # Get key from: https://makersuite.google.com/app/apikey
   export GEMINI_API_KEY=your-key-here
   ```

2. **Wait for quota reset** (usually daily)

3. **Enable debug mode** to see what's happening:
   ```bash
   CG_DEBUG=1 cg "@src/ Find all API endpoints"
   ```

### Timeout issues
```bash
# Increase timeout for large codebases
cg config -s timeout=900
```

### Permission errors
```bash
# Reinstall with proper permissions
sudo npm install -g claude-gemini
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details