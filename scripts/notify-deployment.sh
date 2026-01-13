#!/bin/bash
# Deployment notification script
# Sends deployment notifications to Slack, Discord, or other webhooks
# Usage: ./scripts/notify-deployment.sh [status] [environment] [webhook_url]

set -e

STATUS=${1:-"success"}
ENVIRONMENT=${2:-"production"}
WEBHOOK_URL=${3:-""}

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get deployment info
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
COMMIT_MESSAGE=$(git log -1 --pretty=format:%s 2>/dev/null || echo "Unknown commit")
COMMIT_AUTHOR=$(git log -1 --pretty=format:%an 2>/dev/null || echo "Unknown")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine status color and emoji
if [ "$STATUS" = "success" ]; then
    COLOR="#36a64f"
    EMOJI="✅"
    STATUS_TEXT="succeeded"
elif [ "$STATUS" = "failure" ]; then
    COLOR="#dc3545"
    EMOJI="❌"
    STATUS_TEXT="failed"
elif [ "$STATUS" = "rollback" ]; then
    COLOR="#ff9800"
    EMOJI="⚠️"
    STATUS_TEXT="rolled back"
else
    COLOR="#6c757d"
    EMOJI="ℹ️"
    STATUS_TEXT="started"
fi

# Determine URLs
if [ "$ENVIRONMENT" = "preview" ]; then
    APP_URL="https://preview.adocavo.net"
    HEALTH_URL="https://preview.adocavo.net/api/health"
else
    APP_URL="https://adocavo.net"
    HEALTH_URL="https://adocavo.net/api/health"
fi

# Get GitHub workflow URL if available
WORKFLOW_URL=${GITHUB_SERVER_URL:+${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}}

echo -e "${EMOJI} Deployment notification: $STATUS_TEXT"

# Send notification if webhook URL is provided
if [ -n "$WEBHOOK_URL" ]; then
    echo "Sending notification to webhook..."

    # Detect webhook type (Slack vs Discord)
    if [[ "$WEBHOOK_URL" == *"slack.com"* ]]; then
        # Slack webhook format
        PAYLOAD=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$COLOR",
      "blocks": [
        {
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": "$EMOJI Deployment $STATUS_TEXT: $ENVIRONMENT"
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": "*Environment:*\n$ENVIRONMENT"
            },
            {
              "type": "mrkdwn",
              "text": "*Status:*\n$STATUS_TEXT"
            },
            {
              "type": "mrkdwn",
              "text": "*Branch:*\n$BRANCH"
            },
            {
              "type": "mrkdwn",
              "text": "*Author:*\n$COMMIT_AUTHOR"
            },
            {
              "type": "mrkdwn",
              "text": "*Commit:*\n<$WORKFLOW_URL|$COMMIT_SHA>"
            },
            {
              "type": "mrkdwn",
              "text": "*Time:*\n$TIMESTAMP UTC"
            }
          ]
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Commit Message:*\n$COMMIT_MESSAGE"
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Open App"
              },
              "url": "$APP_URL",
              "style": "primary"
            },
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Health Check"
              },
              "url": "$HEALTH_URL"
            }
          ]
        }
      ]
    }
  ]
}
EOF
)
    elif [[ "$WEBHOOK_URL" == *"discord.com"* ]]; then
        # Discord webhook format
        PAYLOAD=$(cat <<EOF
{
  "embeds": [
    {
      "title": "$EMOJI Deployment $STATUS_TEXT: $ENVIRONMENT",
      "color": "${COLOR#\#}",
      "fields": [
        {
          "name": "Environment",
          "value": "$ENVIRONMENT",
          "inline": true
        },
        {
          "name": "Status",
          "value": "$STATUS_TEXT",
          "inline": true
        },
        {
          "name": "Branch",
          "value": "$BRANCH",
          "inline": true
        },
        {
          "name": "Author",
          "value": "$COMMIT_AUTHOR",
          "inline": true
        },
        {
          "name": "Commit",
          "value": "$COMMIT_SHA",
          "inline": true
        },
        {
          "name": "Time",
          "value": "$TIMESTAMP UTC",
          "inline": true
        }
      ],
      "description": "**Commit Message:**\n$COMMIT_MESSAGE",
      "url": "$WORKFLOW_URL"
    }
  ]
}
EOF
)
    else
        # Generic JSON webhook
        PAYLOAD=$(cat <<EOF
{
  "environment": "$ENVIRONMENT",
  "status": "$STATUS",
  "status_text": "$STATUS_TEXT",
  "branch": "$BRANCH",
  "commit_sha": "$COMMIT_SHA",
  "commit_message": "$COMMIT_MESSAGE",
  "commit_author": "$COMMIT_AUTHOR",
  "timestamp": "$TIMESTAMP",
  "app_url": "$APP_URL",
  "health_url": "$HEALTH_URL",
  "workflow_url": "$WORKFLOW_URL"
}
EOF
)
    fi

    # Send webhook
    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" > /dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Notification sent successfully${NC}"
    else
        echo -e "${YELLOW}Failed to send notification${NC}"
    fi
else
    echo "No webhook URL provided - skipping notification"
    echo ""
    echo "To enable notifications, set webhook URL:"
    echo "  SLACK_WEBHOOK_URL or DISCORD_WEBHOOK_URL"
    echo ""
    echo "Deployment summary:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Status: $STATUS_TEXT"
    echo "  Branch: $BRANCH"
    echo "  Commit: $COMMIT_SHA"
    echo "  Author: $COMMIT_AUTHOR"
    echo "  Message: $COMMIT_MESSAGE"
    echo "  Time: $TIMESTAMP"
    echo "  URL: $APP_URL"
fi

echo ""
