#!/bin/bash
# Validate environment configuration before deployment
# Usage: ./scripts/validate-env.sh [environment]

set -e

ENVIRONMENT=${1:-production}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Adocavo Environment Validation ===${NC}"
echo "Environment: $ENVIRONMENT"
echo ""

# Counters
ISSUES=0
WARNINGS=0

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing file: $1"
        ((ISSUES++))
        return 1
    fi
}

check_env_var() {
    local var_name=$1
    local file=$2

    if grep -q "^${var_name}=" "$file" 2>/dev/null; then
        local value=$(grep "^${var_name}=" "$file" | cut -d'=' -f2-)
        if [ -n "$value" ] && [ "$value" != "replace-with"* ]; then
            echo -e "${GREEN}✓${NC} $var_name is set"
            return 0
        else
            echo -e "${YELLOW}⚠${NC} $var_name is set but appears to be placeholder"
            ((WARNINGS++))
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $var_name is not set"
        ((ISSUES++))
        return 1
    fi
}

check_wrangler_binding() {
    local binding=$1
    local config=$2

    if grep -q "$binding" "$config" 2>/dev/null; then
        local value=$(grep "$binding" "$config" | grep -v "^#" | head -1)
        if echo "$value" | grep -q "REPLACE_WITH"; then
            echo -e "${RED}✗${NC} $binding contains placeholder value"
            ((ISSUES++))
            return 1
        elif echo "$value" | grep -q 'id = ""'; then
            echo -e "${RED}✗${NC} $binding has empty ID"
            ((ISSUES++))
            return 1
        else
            echo -e "${GREEN}✓${NC} $binding is configured"
            return 0
        fi
    else
        echo -e "${RED}✗${NC} $binding not found in config"
        ((ISSUES++))
        return 1
    fi
}

# Validation checks
echo "Checking required files..."

check_file "package.json"
check_file "wrangler.toml"
check_file ".env.example"
check_file "tsconfig.json"

echo ""
echo "Checking configuration files..."

if check_file "wrangler.toml"; then
    echo ""
    echo "Validating wrangler.toml bindings..."

    check_wrangler_binding "NEXT_INC_CACHE_KV" "wrangler.toml"
    check_wrangler_binding "NEXT_TAG_CACHE_KV" "wrangler.toml"
    check_wrangler_binding "adocavo-db" "wrangler.toml"
    check_wrangler_binding "AI" "wrangler.toml"

    # Check for account_id
    if grep -q "account_id = " wrangler.toml; then
        echo -e "${GREEN}✓${NC} account_id is set"
    else
        echo -e "${YELLOW}⚠${NC} account_id not set (will use --account-id flag)"
    fi
fi

echo ""
echo "Checking environment variables..."

if [ -f ".env.local" ]; then
    echo "Using .env.local for validation"
    ENV_FILE=".env.local"
elif [ -f ".env" ]; then
    echo "Using .env for validation"
    ENV_FILE=".env"
else
    echo -e "${YELLOW}⚠${NC} No .env or .env.local file found"
    ENV_FILE=""
fi

if [ -n "$ENV_FILE" ]; then
    check_env_var "NEXTAUTH_URL" "$ENV_FILE"
    check_env_var "NEXTAUTH_SECRET" "$ENV_FILE"
    check_env_var "NEXT_PUBLIC_SITE_URL" "$ENV_FILE"
else
    echo -e "${RED}✗${NC} Cannot validate environment variables - no .env file found"
    ((ISSUES++))
fi

echo ""
echo "Checking Node.js and npm..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"

    # Check if version is 20+
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 20 ]; then
        echo -e "${YELLOW}⚠${NC} Node.js version should be 20+ (current: $MAJOR_VERSION)"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} Node.js not found"
    ((ISSUES++))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    ((ISSUES++))
fi

echo ""
echo "Checking Cloudflare CLI..."

if command -v wrangler &> /dev/null || npx wrangler --version &> /dev/null; then
    WRANGLER_VERSION=$(npx wrangler --version 2>&1 | head -1 || echo "unknown")
    echo -e "${GREEN}✓${NC} Wrangler installed: $WRANGLER_VERSION"
else
    echo -e "${RED}✗${NC} Wrangler not found"
    ((ISSUES++))
fi

echo ""
echo "Checking dependencies..."

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found - run: npm install"
    ((WARNINGS++))
fi

echo ""
echo "Checking build artifacts..."

if [ -d ".next" ]; then
    echo -e "${YELLOW}⚠${NC} .next exists (stale build?)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} No stale build artifacts"
fi

if [ -d ".open-next" ]; then
    echo -e "${YELLOW}⚠${NC} .open-next exists (stale build?)"
    ((WARNINGS++))
else
    echo -e "${GREEN}✓${NC} No stale OpenNext build"
fi

echo ""
echo "Checking migration files..."

if [ -d "drizzle/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 drizzle/migrations/*.sql 2>/dev/null | wc -l)
    echo -e "${GREEN}✓${NC} Migrations directory exists ($MIGRATION_COUNT files)"
else
    echo -e "${RED}✗${NC} Migrations directory not found"
    ((ISSUES++))
fi

echo ""
echo "Checking scripts..."

SCRIPTS=(
    "scripts/setup-secrets.sh"
    "scripts/rollback.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✓${NC} $script is executable"
        else
            echo -e "${YELLOW}⚠${NC} $script exists but not executable"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} $script not found"
        ((WARNINGS++))
    fi
done

echo ""
echo "=== Validation Summary ==="

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Ready for deployment.${NC}"
    exit 0
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}Found $WARNINGS warning(s). Review before deployment.${NC}"
    exit 0
else
    echo -e "${RED}Found $ISSUES issue(s) and $WARNINGS warning(s). Fix issues before deployment.${NC}"
    exit 1
fi
