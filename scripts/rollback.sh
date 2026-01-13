#!/bin/bash
# Rollback Cloudflare Worker deployment to previous version
# Usage: ./scripts/rollback.sh [environment]
#   environment: production (default) or preview

set -e

ENVIRONMENT=${1:-production}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Adocavo Deployment Rollback ==="
echo "Environment: $ENVIRONMENT"
echo ""

# Determine worker name and database based on environment
if [ "$ENVIRONMENT" = "preview" ]; then
    WORKER_NAME="adocavo-preview"
    DB_NAME="adocavo-db-preview"
else
    WORKER_NAME="adocavo-net"
    DB_NAME="adocavo-db"
fi

echo "Worker: $WORKER_NAME"
echo "Database: $DB_NAME"
echo ""

# Confirm rollback
read -p "Are you sure you want to rollback $ENVIRONMENT? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Step 1: Checking current deployment..."
CURRENT_VERSION=$(npx wrangler deployments list --name "$WORKER_NAME" 2>/dev/null | head -n 1 || echo "unknown")
echo "Current: $CURRENT_VERSION"

echo ""
echo "Step 2: Getting previous deployment info..."
# Note: Wrangler doesn't have a built-in rollback command yet
# This script provides manual guidance and checks health

echo ""
echo "Step 3: Checking if we can restore from Git..."
read -p "Do you want to restore from a previous Git commit? (yes/no): " USE_GIT

if [ "$USE_GIT" = "yes" ]; then
    echo ""
    echo "Recent commits:"
    git log --oneline -10

    echo ""
    read -p "Enter commit SHA to rollback to: " COMMIT_SHA

    if [ -z "$COMMIT_SHA" ]; then
        echo "No commit specified. Exiting."
        exit 1
    fi

    echo ""
    echo "Checking out commit: $COMMIT_SHA"
    git checkout "$COMMIT_SHA"

    echo ""
    echo "Building and redeploying..."
    npm run build
    npm run build:open-next

    echo ""
    echo "Deploying previous version..."
    npx wrangler deploy

    echo ""
    echo -e "${GREEN}Rollback completed via Git!${NC}"
else
    echo ""
    echo -e "${YELLOW}Manual rollback required:${NC}"
    echo ""
    echo "Option 1: Restore from Cloudflare dashboard"
    echo "  1. Go to: https://dash.cloudflare.com"
    echo "  2. Navigate to Workers & Pages"
    echo "  3. Select $WORKER_NAME"
    echo "  4. Check Deployments history"
    echo "  5. Rollback to previous version if available"
    echo ""
    echo "Option 2: Redeploy previous commit manually"
    echo "  1. git log --oneline -10"
    echo "  2. git checkout <previous-commit-sha>"
    echo "  3. npm run build && npm run build:open-next"
    echo "  4. npx wrangler deploy"
    echo ""
fi

echo ""
echo "Step 4: Database rollback (if needed)..."
read -p "Do you need to rollback the database? (yes/no): " ROLLBACK_DB

if [ "$ROLLBACK_DB" = "yes" ]; then
    echo ""
    echo -e "${YELLOW}Database rollback requires manual intervention:${NC}"
    echo ""
    echo "1. Check available backups:"
    echo "   npx wrangler d1 backups list --database=$DB_NAME"
    echo ""
    echo "2. Restore from backup:"
    echo "   npx wrangler d1 backups restore --database=$DB_NAME --backup-id=<backup-id>"
    echo ""
    echo "3. Or manually run rollback migration (if exists):"
    echo "   npx wrangler d1 execute $DB_NAME --remote --file=path/to/rollback.sql"
    echo ""
    read -p "Have you backed up the current database state? (yes/no): " BACKUP_CONFIRM

    if [ "$BACKUP_CONFIRM" != "yes" ]; then
        echo ""
        echo "Please backup the database first:"
        echo "  npx wrangler d1 export $DB_NAME --remote --output=backup-$(date +%Y%m%d_%H%M%S).sql"
        echo ""
        exit 1
    fi
fi

echo ""
echo "Step 5: Health check..."
echo "Waiting 30 seconds for deployment to propagate..."
sleep 30

if [ "$ENVIRONMENT" = "preview" ]; then
    HEALTH_URL="https://preview.adocavo.net/api/health"
else
    HEALTH_URL="https://adocavo.net/api/health"
fi

echo "Checking health at: $HEALTH_URL"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}Health check passed!${NC}"
    curl -s "$HEALTH_URL" | jq .
else
    echo -e "${RED}Health check failed with status: $HEALTH_STATUS${NC}"
    echo ""
    echo "Please check logs:"
    echo "  npx wrangler tail --name=$WORKER_NAME"
    exit 1
fi

echo ""
echo "=== Rollback Complete ==="
echo ""
echo "Post-rollback checklist:"
echo "  1. Verify site functionality manually"
echo "  2. Check analytics for errors"
echo "  3. Monitor logs: npx wrangler tail --name=$WORKER_NAME"
echo "  4. Update team/stakeholders if needed"
echo ""
