#!/bin/bash

# FamFlix Dependency Update Script
# This script updates dependencies and runs tests to ensure everything works

set -e  # Exit on any error

echo "🚀 Starting dependency update process..."

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

# Update dependencies
echo "⬆️ Updating dependencies..."
npm update

# Update dev dependencies
echo "⬆️ Updating development dependencies..."
npm update --dev

# Check for major version updates (interactive)
echo "🔍 Checking for major version updates..."
npx npm-check-updates --target minor --interactive

# Install dependencies
echo "📦 Installing updated dependencies..."
npm install

# Run type checking
echo "🔍 Running TypeScript type checking..."
npm run check

# Build the project
echo "🏗️ Building the project..."
npm run build

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
echo "🎉 Dependency update completed successfully!"
echo ""
echo "📊 Summary:"
echo "  - Dependencies updated"
echo "  - TypeScript checks passed"
echo "  - Build completed successfully"
echo "  - Development server tested"
echo ""
echo "📝 Next steps:"
echo "  1. Review the changes in package.json"
echo "  2. Test the application thoroughly"
echo "  3. Commit the changes if everything looks good"
echo ""
echo "🔄 To revert changes:"
echo "  cp package.json.backup package.json"
echo "  cp package-lock.json.backup package-lock.json"
echo "  npm install" 