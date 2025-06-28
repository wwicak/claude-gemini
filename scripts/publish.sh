#!/bin/bash

# Script to publish claude-gemini to npm and update Homebrew formula

set -e

echo "🚀 Publishing claude-gemini..."

# 1. Build the project
echo "Building project..."
npm run build

# 2. Run tests (if any)
# npm test

# 3. Publish to npm
echo "Publishing to npm..."
npm publish

# 4. Get the published tarball URL and SHA256
VERSION=$(node -p "require('./package.json').version")
TARBALL_URL="https://registry.npmjs.org/claude-gemini/-/claude-gemini-${VERSION}.tgz"

echo "Downloading tarball to calculate SHA256..."
curl -sL "$TARBALL_URL" -o "claude-gemini-${VERSION}.tgz"
SHA256=$(shasum -a 256 "claude-gemini-${VERSION}.tgz" | awk '{print $1}')
rm "claude-gemini-${VERSION}.tgz"

echo "Version: $VERSION"
echo "Tarball URL: $TARBALL_URL"
echo "SHA256: $SHA256"

# 5. Update Homebrew formula
echo ""
echo "To update Homebrew formula:"
echo "1. Update version in Formula/claude-gemini.rb"
echo "2. Replace PLACEHOLDER_SHA256 with: $SHA256"
echo "3. Push to homebrew-claude-gemini repo"
echo ""
echo "Formula update:"
echo "  url \"$TARBALL_URL\""
echo "  sha256 \"$SHA256\""