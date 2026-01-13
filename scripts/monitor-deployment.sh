#!/bin/bash
# Post-deployment monitoring script
# Monitors deployment health and metrics after deployment
# Usage: ./scripts/monitor-deployment.sh [environment] [duration_minutes]

set -e

ENVIRONMENT=${1:-"production"}
DURATION=${2:-5} # Monitor for 5 minutes by default

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine URLs
if [ "$ENVIRONMENT" = "preview" ]; then
    BASE_URL="https://preview.adocavo.net"
    WORKER_NAME="adocavo-preview"
else
    BASE_URL="https://adocavo.net"
    WORKER_NAME="adocavo-net"
fi

HEALTH_URL="$BASE_URL/api/health"
MONITOR_END=$((SECONDS + (DURATION * 60)))

echo -e "${BLUE}=== Post-Deployment Monitoring ===${NC}"
echo "Environment: $ENVIRONMENT"
echo "Duration: ${DURATION} minutes"
echo "Base URL: $BASE_URL"
echo "End time: $(date -d "+$DURATION minutes" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -v+${DURATION}M -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Metrics tracking
TOTAL_CHECKS=0
SUCCESSFUL_CHECKS=0
FAILED_CHECKS=0
MAX_LATENCY=0
MIN_LATENCY=99999
AVG_LATENCY=0
TOTAL_LATENCY=0

# Health check endpoints
ENDPOINTS=(
    "$BASE_URL"
    "$BASE_URL/api/health"
    "$BASE_URL/api/hooks"
)

echo -e "${BLUE}Monitoring endpoints:${NC}"
for endpoint in "${ENDPOINTS[@]}"; do
    echo "  • $endpoint"
done
echo ""

echo -e "${BLUE}Starting health checks...${NC}"
echo ""

while [ $SECONDS -lt $MONITOR_END ]; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    CHECK_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Check health endpoint
    HEALTH_START=$(date +%s%3N)
    HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    HEALTH_END=$(date +%s%3N)
    HEALTH_LATENCY=$((HEALTH_END - HEALTH_START))

    echo -n "[$CHECK_TIME] Health check: "

    if [ "$HEALTH_RESPONSE" = "200" ]; then
        SUCCESSFUL_CHECKS=$((SUCCESSFUL_CHECKS + 1))

        # Parse JSON response
        HEALTH_DATA=$(curl -s "$HEALTH_URL" 2>/dev/null)
        STATUS=$(echo "$HEALTH_DATA" | jq -r '.status' 2>/dev/null || echo "unknown")
        LATENCY=$(echo "$HEALTH_DATA" | jq -r '.latency // .checks.database.latency // 0' 2>/dev/null || echo "0")

        # Update latency metrics
        if [ "$LATENCY" -gt "$MAX_LATENCY" ]; then
            MAX_LATENCY=$LATENCY
        fi
        if [ "$LATENCY" -lt "$MIN_LATENCY" ] && [ "$LATENCY" -gt 0 ]; then
            MIN_LATENCY=$LATENCY
        fi
        TOTAL_LATENCY=$((TOTAL_LATENCY + LATENCY))
        AVG_LATENCY=$((TOTAL_LATENCY / SUCCESSFUL_CHECKS))

        echo -e "${GREEN}✓${NC} ${HEALTH_LATENCY}ms | Status: $STATUS | Latency: ${LATENCY}ms"

        # Check for degraded services
        if echo "$HEALTH_DATA" | jq -e '.checks | to_entries | any(.value.status == "error")' > /dev/null 2>&1; then
            echo -e "  ${YELLOW}⚠ Warning: Some services degraded${NC}"
            echo "$HEALTH_DATA" | jq -r '.checks | to_entries[] | select(.value.status == "error") | "  - \(.key): \(.value.details // "unknown")"' 2>/dev/null || true
        fi
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        echo -e "${RED}✗${NC} HTTP $HEALTH_RESPONSE | ${HEALTH_LATENCY}ms"
    fi

    # Sample other endpoints every 30 seconds
    if [ $((TOTAL_CHECKS % 6)) -eq 0 ]; then
        echo -e "  ${BLUE}Checking additional endpoints...${NC}"
        for endpoint in "${ENDPOINTS[@]}"; do
            if [ "$endpoint" != "$HEALTH_URL" ]; then
                ENDPOINT_START=$(date +%s%3N)
                ENDPOINT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
                ENDPOINT_END=$(date +%s%3N)
                ENDPOINT_LATENCY=$((ENDPOINT_END - ENDPOINT_START))

                if [ "$ENDPOINT_RESPONSE" != "000" ] && [ "$ENDPOINT_RESPONSE" -lt 500 ]; then
                    echo -e "    ${GREEN}✓${NC} ${endpoint##*/}: ${ENDPOINT_RESPONSE} (${ENDPOINT_LATENCY}ms)"
                else
                    echo -e "    ${RED}✗${NC} ${endpoint##*/}: ${ENDPOINT_RESPONSE} (${ENDPOINT_LATENCY}ms)"
                fi
            fi
        done
    fi

    # Wait before next check (10 seconds)
    if [ $SECONDS -lt $MONITOR_END ]; then
        sleep 10
    fi
done

echo ""
echo -e "${BLUE}=== Monitoring Complete ===${NC}"
echo ""
echo "Summary:"
echo "  Total checks: $TOTAL_CHECKS"
echo "  Successful: $SUCCESSFUL_CHECKS"
echo "  Failed: $FAILED_CHECKS"
echo "  Success rate: $(awk "BEGIN {printf \"%.1f\", ($SUCCESSFUL_CHECKS/$TOTAL_CHECKS)*100}")%"
echo ""
echo "Latency:"
echo "  Min: ${MIN_LATENCY}ms"
echo "  Max: ${MAX_LATENCY}ms"
echo "  Avg: ${AVG_LATENCY}ms"
echo ""

# Determine overall health
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment is healthy!${NC}"
    exit 0
elif [ $FAILED_CHECKS -lt $((TOTAL_CHECKS / 4)) ]; then
    echo -e "${YELLOW}⚠️ Deployment has minor issues (success rate < 100%)${NC}"
    exit 0
else
    echo -e "${RED}❌ Deployment has significant issues (failure rate >= 25%)${NC}"
    echo ""
    echo "Recommendations:"
    echo "  1. Check logs: npx wrangler tail --name=$WORKER_NAME"
    echo "  2. Review recent changes"
    echo "  3. Consider rollback: ./scripts/rollback.sh $ENVIRONMENT"
    exit 1
fi
