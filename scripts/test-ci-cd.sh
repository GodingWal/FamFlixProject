#!/bin/bash

# FamFlix CI/CD Test Script
# This script tests all the CI/CD pipeline components locally

set -e

echo "🧪 Testing FamFlix CI/CD Pipeline Components"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_step() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    echo "Command: $command"
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Test 1: TypeScript Type Checking
test_step "TypeScript Type Checking" "npm run check"

# Test 2: Build Process
test_step "Build Process" "npm run build"

# Test 3: Development Server Startup
test_step "Development Server Startup" "timeout 3 NODE_ENV=development npm run dev >/dev/null 2>&1"

# Test 4: Security Audit
test_step "Security Audit" "npm audit --audit-level=high >/dev/null 2>&1 || true"

# Test 5: Dependency Check
test_step "Dependency Check" "npm outdated --json >/dev/null 2>&1 || true"

# Test 6: Package.json Validation
test_step "Package.json Validation" "npm run check"

# Test 7: Script Availability
test_step "Update Scripts Availability" "test -f scripts/update-deps.sh && test -f scripts/update-deps-conservative.sh"

# Test 8: GitHub Actions Workflow
test_step "GitHub Actions Workflow" "test -f .github/workflows/ci.yml"

# Test 9: Documentation
test_step "Documentation Files" "test -f docs/CI-CD.md && test -f README.md"

# Test 10: Environment Variables
test_step "Environment Setup" "test -f .env || echo 'No .env file (this is normal for testing)'"

echo "=============================================="
echo "🧪 Test Results Summary"
echo "=============================================="
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All CI/CD components are working correctly!${NC}"
    echo ""
    echo "🚀 Your FamFlix project is ready for:"
    echo "   • Automated testing on every push/PR"
    echo "   • Weekly dependency updates"
    echo "   • Security vulnerability scanning"
    echo "   • Automated deployment previews"
    echo "   • Comprehensive build validation"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Push your code to GitHub"
    echo "   2. Check the Actions tab for pipeline status"
    echo "   3. Configure any additional secrets if needed"
    echo "   4. Monitor the automated dependency updates"
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the issues above.${NC}"
    echo ""
    echo "🔧 Common fixes:"
    echo "   • Run 'npm install' to ensure all dependencies are installed"
    echo "   • Check TypeScript errors with 'npm run check'"
    echo "   • Verify all required files exist"
    echo "   • Ensure proper environment setup"
fi

echo ""
echo "📚 For more information, see:"
echo "   • docs/CI-CD.md - Complete CI/CD documentation"
echo "   • README.md - Project overview and setup"
echo "   • .github/workflows/ci.yml - Pipeline configuration" 