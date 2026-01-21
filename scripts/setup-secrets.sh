#!/bin/bash
# Setup Cloudflare Worker secrets for production deployment
# Usage: ./scripts/setup-secrets.sh [environment]
#   environment: production (default), preview, or development

set -e

ENVIRONMENT=${1:-production}
ENV_FLAG=""

if [ "$ENVIRONMENT" != "production" ]; then
    ENV_FLAG="--env $ENVIRONMENT"
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Adocavo Secrets Setup ===${NC}"
echo "Environment: $ENVIRONMENT"
echo ""

# Validate wrangler is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Please install Node.js.${NC}"
    exit 1
fi

if ! npx wrangler --version &> /dev/null; then
    echo -e "${RED}Error: wrangler not found. Please install: npm install -g wrangler${NC}"
    exit 1
fi

echo -e "${YELLOW}This script will set the following secrets:${NC}"
echo ""
echo "Required Secrets:"
echo "  - NEXTAUTH_SECRET (32+ character random string)"
echo "  - GOOGLE_CLIENT_ID (Google OAuth)"
echo "  - GOOGLE_CLIENT_SECRET (Google OAuth)"
echo "  - GITHUB_CLIENT_ID (GitHub OAuth)"
echo "  - GITHUB_CLIENT_SECRET (GitHub OAuth)"
echo "  - TURNSTILE_SECRET_KEY (Cloudflare Turnstile)"
echo ""
echo "Optional Secrets:"
echo "  - LOG_DRAIN_TOKEN (for external logging)"
echo ""
echo "How to generate values:"
echo "  1. NEXTAUTH_SECRET: openssl rand -base64 32"
echo "  2. OAuth credentials: Get from Google/GitHub developer consoles"
echo "  3. Turnstile secret: Cloudflare dashboard -> Turnstile"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Connecting to Cloudflare..."
npx wrangler whoami || echo -e "${YELLOW}Note: Not logged in or token expired${NC}"

echo ""
echo -e "${GREEN}Setting secrets for: $ENVIRONMENT${NC}"
echo ""

# Function to set secret with validation
set_secret() {
    local name=$1
    local desc=$2
    local required=$3

    while true; do
        read -p "Enter $name ($desc): " value

        if [ -z "$value" ]; then
            if [ "$required" = "required" ]; then
                echo -e "${RED}This secret is required. Please provide a value.${NC}"
                continue
            else
                echo "Skipping $name"
                break
            fi
        fi

        # Validate NEXTAUTH_SECRET length
        if [ "$name" = "NEXTAUTH_SECRET" ]; then
            if [ ${#value} -lt 32 ]; then
                echo -e "${RED}NEXTAUTH_SECRET must be at least 32 characters. Current length: ${#value}${NC}"
                continue
            fi
        fi

        # Set the secret
        echo "$value" | npx wrangler secret put "$name" $ENV_FLAG
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Set $name successfully${NC}"
        else
            echo -e "${RED}Failed to set $name${NC}"
            return 1
        fi
        break
    done
}

# Set required secrets
set_secret "NEXTAUTH_SECRET" "32+ character random string for session encryption" "required"
set_secret "GOOGLE_CLIENT_ID" "Google OAuth Client ID (from Google Cloud Console)" "required"
set_secret "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret" "required"
set_secret "GITHUB_CLIENT_ID" "GitHub OAuth App Client ID (from GitHub Developer Settings)" "required"
set_secret "GITHUB_CLIENT_SECRET" "GitHub OAuth App Client Secret" "required"
set_secret "TURNSTILE_SECRET_KEY" "Cloudflare Turnstile secret key" "required"

# Set optional secrets
echo ""
echo "Optional secrets (press Enter to skip):"
set_secret "LOG_DRAIN_TOKEN" "Token for external log drain service" "optional"

echo ""
echo -e "${GREEN}=== Secrets Setup Complete ===${NC}"
echo ""
echo "Verify secrets with:"
echo "  npx wrangler secret list $ENV_FLAG"
echo ""
echo "Current secrets for $ENVIRONMENT:"
npx wrangler secret list $ENV_FLAG 2>/dev/null || echo "Could not list secrets"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Store secret values securely (e.g., 1Password, LastPass)"
echo "  - Never commit secrets to git"
echo "  - Rotate secrets periodically"
echo "  - Use separate secrets for each environment"
echo ""
echo "Next steps:"
echo "  1. Verify wrangler.toml configuration"
echo "  2. Run: npm run deploy"
echo "  3. Check health: curl https://adocavo.net/api/health"
echo ""
