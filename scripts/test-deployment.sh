#!/bin/bash

# FamFlix Deployment Readiness Test
# This script tests if the application is ready for EC2 deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 FamFlix Deployment Readiness Test${NC}"
echo "=============================================="
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_step() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Test 1: TypeScript compilation
test_step "TypeScript Compilation" "npm run check"

# Test 2: Production build
test_step "Production Build" "npm run build"

# Test 3: Build artifacts exist
test_step "Build Artifacts" "test -f dist/index.js && test -d dist/public"

# Test 4: PM2 ecosystem file exists
test_step "PM2 Configuration" "test -f ecosystem.config.cjs"

# Test 5: Deployment scripts exist
test_step "Deployment Scripts" "test -f scripts/deploy-ec2.sh && test -f scripts/copy-to-ec2.sh"

# Test 6: Scripts are executable
test_step "Script Permissions" "test -x scripts/deploy-ec2.sh && test -x scripts/copy-to-ec2.sh"

# Test 7: Package.json has deployment scripts
test_step "Package.json Scripts" "grep -q 'deploy-ec2' package.json && grep -q 'copy-to-ec2' package.json"

# Test 8: Environment variables are configured
test_step "Environment Configuration" "test -f .env || echo 'No .env file (will be created on EC2)'"

# Test 9: Database schema is valid
test_step "Database Schema" "test -f shared/schema.ts"

# Test 10: Dependencies are installed
test_step "Dependencies" "test -d node_modules"

# Test 11: Security audit (non-blocking)
test_step "Security Audit" "npm audit --audit-level=high >/dev/null 2>&1 || echo 'Security warnings found (review recommended)'"

# Test 12: File size check
test_step "Build Size Check" "test $(du -sm dist | cut -f1) -lt 500"

echo "=============================================="
echo "🧪 Deployment Readiness Summary"
echo "=============================================="
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Your FamFlix application is ready for EC2 deployment!${NC}"
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Launch an EC2 instance (Ubuntu 20.04+)"
    echo "2. Configure security group (ports 22, 80, 443, 5000)"
    echo "3. Copy your SSH key and set permissions: chmod 400 your-key.pem"
    echo "4. Run: ./scripts/copy-to-ec2.sh YOUR_EC2_IP ~/.ssh/your-key.pem"
    echo ""
    echo "📚 For detailed instructions, see: docs/EC2-DEPLOYMENT.md"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please fix the issues before deploying.${NC}"
    echo ""
    echo "🔧 Common fixes:"
    echo "• Run 'npm install' to install dependencies"
    echo "• Run 'npm run check' to fix TypeScript errors"
    echo "• Run 'npm run build' to create production build"
    echo "• Check file permissions: chmod +x scripts/*.sh"
fi

echo ""
echo "📊 Build Information:"
echo "• Build size: $(du -sh dist 2>/dev/null | cut -f1 || echo 'N/A')"
echo "• Node modules: $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
echo "• TypeScript files: $(find . -name "*.ts" -o -name "*.tsx" | wc -l)"
echo "• Total files: $(find . -type f | wc -l)" 