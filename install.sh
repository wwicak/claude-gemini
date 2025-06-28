#!/bin/bash

# Global installation script for Claude-Gemini CLI

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Installing Claude-Gemini CLI globally..."

# Method 1: npm global install (if in npm registry)
install_npm() {
    echo "Installing via npm..."
    npm install -g claude-gemini
}

# Method 2: Install from local directory
install_local() {
    echo "Installing from local directory..."
    cd "$SCRIPT_DIR"
    npm install
    npm run build
    npm link
}

# Method 3: Install via curl/wget (from GitHub)
install_github() {
    echo "Installing from GitHub..."
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Clone or download
    if command -v git &> /dev/null; then
        git clone https://github.com/claude-gemini/claude-gemini-cli.git
    else
        curl -L https://github.com/claude-gemini/claude-gemini-cli/archive/main.tar.gz | tar xz
        cd claude-gemini-cli-main
    fi
    
    npm install
    npm run build
    npm link
    
    cd /
    rm -rf "$TEMP_DIR"
}

# Check if we're in the package directory
if [ -f "$SCRIPT_DIR/package.json" ]; then
    install_local
else
    # Try npm first, fall back to GitHub
    if npm view claude-gemini &> /dev/null; then
        install_npm
    else
        install_github
    fi
fi

echo "✅ Claude-Gemini CLI installed successfully!"
echo ""
echo "Quick start:"
echo "  1. Initialize in your project: cg init"
echo "  2. Test it: cg \"@package.json What is this?\""
echo "  3. See help: cg --help"