#!/bin/bash

# One-line installer for Claude-Gemini CLI
# Usage: curl -fsSL https://claude-gemini.dev/install.sh | bash

set -e

echo "🚀 Installing Claude-Gemini CLI..."

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

# Install based on OS
case "$OS" in
    Darwin*)
        echo "Detected macOS"
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            brew tap claude-gemini/tap
            brew install claude-gemini
        else
            echo "Installing via npm..."
            npm install -g claude-gemini
        fi
        ;;
    Linux*)
        echo "Detected Linux"
        if command -v npm &> /dev/null; then
            npm install -g claude-gemini
        else
            echo "Error: npm not found. Please install Node.js first."
            exit 1
        fi
        ;;
    *)
        echo "Unsupported OS: $OS"
        exit 1
        ;;
esac

# Initialize global config
cg init --global

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Go to any project: cd your-project"
echo "2. Initialize: cg init"
echo "3. Test: cg \"@package.json What is this?\""
echo ""
echo "For more info: cg --help"