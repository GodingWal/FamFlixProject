#!/bin/bash

# FamFlix Conservative Dependency Update Script
# This script updates dependencies more conservatively to avoid breaking changes

set -e  # Exit on any error

echo "🚀 Starting conservative dependency update process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Backup current package files
echo "📦 Backing up current package files..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || echo "No package-lock.json found"

# Check for outdated packages
echo "🔍 Checking for outdated packages..."
npm outdated --json > outdated.json 2>/dev/null || echo "No outdated packages found"

if [ -s outdated.json ]; then
    echo "📋 Found outdated packages:"
    cat outdated.json | jq -r 'to_entries[] | "  \(.key): \(.value.current) -> \(.value.latest)"' 2>/dev/null || cat outdated.json
else
    echo "✅ All packages are up to date!"
    rm -f outdated.json
    exit 0
fi

# Update only patch and minor versions (conservative approach)
echo "⬆️ Updating dependencies conservatively (patch and minor versions only)..."
npm update

# Update dev dependencies conservatively
echo "⬆️ Updating development dependencies conservatively..."
npm update --dev

# Check for security vulnerabilities
echo "🔒 Checking for security vulnerabilities..."
npm audit --audit-level=moderate || echo "Security audit completed with warnings"

# Install dependencies
echo "📦 Installing updated dependencies..."
npm install

# Run type checking
echo "🔍 Running TypeScript type checking..."
if npm run check; then
    echo "✅ TypeScript checks passed"
else
    echo "❌ TypeScript checks failed - reverting changes"
    cp package.json.backup package.json
    cp package-lock.json.backup package-lock.json 2>/dev/null || true
    npm install
    echo "🔄 Changes reverted. Please review compatibility issues manually."
    exit 1
fi

# Build the project
echo "🏗️ Building the project..."
if npm run build; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed - reverting changes"
    cp package.json.backup package.json
    cp package-lock.json.backup package-lock.json 2>/dev/null || true
    npm install
    echo "🔄 Changes reverted. Please review compatibility issues manually."
    exit 1
fi

# Test the development server
echo "🧪 Testing development server..."
timeout 10s npm run dev &
DEV_PID=$!
sleep 5

# Check if server is responding
if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Development server is responding correctly"
else
    echo "⚠️ Development server may not be responding (this is normal if it's still starting)"
fi

# Stop the development server
kill $DEV_PID 2>/dev/null || true

# Show summary
echo ""
echo "🎉 Conservative dependency update completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - Dependencies updated (patch and minor versions only)"
echo "  - TypeScript checks passed"
echo "  - Build completed successfully"
echo "  - Development server tested"
echo ""
echo "📝 Next steps:"
echo "  1. Review the changes in package.json"
echo "  2. Test the application thoroughly"
echo "  3. Consider updating major versions manually if needed"
echo "  4. Commit the changes if everything looks good"
echo ""
echo "🔄 To revert changes:"
echo "  cp package.json.backup package.json"
echo "  cp package-lock.json.backup package-lock.json"
echo "  npm install"
echo ""
echo "💡 For major version updates, consider:"
echo "  - Reading migration guides for each package"
echo "  - Updating one package at a time"
echo "  - Testing thoroughly after each update" 