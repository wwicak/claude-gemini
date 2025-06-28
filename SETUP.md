# Setup Guide for Publishing

## Prerequisites

1. Create GitHub repository: https://github.com/wwicak/claude-gemini
2. Create npm account at https://www.npmjs.com/
3. Create Homebrew tap repository: https://github.com/wwicak/homebrew-claude-gemini

## Steps to Publish

### 1. Push to GitHub

```bash
cd /Users/dimastriwicaksono/Documents/e-proc/claude-gemini-cli
git push -u origin main
```

### 2. Install Dependencies & Build

```bash
npm install
npm run build
```

### 3. Login to npm

```bash
npm login
# Enter your npm credentials
```

### 4. Publish to npm

```bash
npm publish
```

### 5. Set up Homebrew Tap

```bash
cd /Users/dimastriwicaksono/Documents/e-proc/homebrew-claude-gemini
git init
git add .
git commit -m "Add claude-gemini formula"
git remote add origin https://github.com/wwicak/homebrew-claude-gemini.git
git push -u origin main
```

### 6. Update Homebrew Formula

After publishing to npm:

1. Run the publish script to get the SHA256:
   ```bash
   ./scripts/publish.sh
   ```

2. Update the SHA256 in homebrew-claude-gemini/Formula/claude-gemini.rb

3. Push the updated formula:
   ```bash
   cd ../homebrew-claude-gemini
   git add .
   git commit -m "Update claude-gemini to version X.X.X"
   git push
   ```

## Testing Installation

### Via npm:
```bash
npm install -g claude-gemini
cg --version
```

### Via Homebrew:
```bash
brew tap wwicak/claude-gemini
brew install claude-gemini
cg --version
```

## Usage in Projects

```bash
# In any project
cg init

# Test
cg "@package.json What is this?"
```