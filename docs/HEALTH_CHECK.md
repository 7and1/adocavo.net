# Health Check & Monitoring Guide

## Overview

The health check endpoint provides comprehensive monitoring for the Adocavo.net application, including database connectivity, Workers AI availability, and response latency metrics.

**Endpoint:** `GET /api/health`
**Production URL:** `https://adocavo.net/api/health`
**Preview URL:** `https://preview.adocavo.net/api/health`

---

## Health Check Response

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "runtime": "edge",
  "latency": 45,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 12
    },
    "ai": {
      "status": "healthy",
      "latency": 33
    }
  }
}
```

### Status Values

- **`healthy`**: All services operational (HTTP 200)
- **`unhealthy`**: One or more critical services down (HTTP 503)
- **`error`**: Health check itself failed (HTTP 500)

### Runtime Values

- **`edge`**: Cloudflare Workers runtime
- **`nodejs`**: Node.js runtime (development)
- **`unknown`**: Runtime detection failed

---

## Health Checks

### Database Check

Tests D1 database connectivity and basic operations:

```javascript
{
  "database": {
    "status": "healthy" | "error",
    "latency": 12,        // milliseconds
    "details": "error message if status is error"
  }
}
```

**Checks performed:**

1. Connection test: `SELECT 1 as ping`
2. Write test: Update statement (no rows affected)
3. Read/Write latency measurement

**Common issues:**

- **"DB binding missing"**: Check wrangler.toml D1 configuration
- **"Database connection timeout"**: D1 service may be degraded
- **"Migration table missing"**: Run migrations: `wrangler d1 migrations apply adocavo-db --remote`

### Workers AI Check

Tests Workers AI service availability:

```javascript
{
  "ai": {
    "status": "healthy" | "error",
    "latency": 33,        // milliseconds
    "details": "error message if status is error"
  }
}
```

**Checks performed:**

1. Model availability test with minimal prompt
2. Response latency measurement
3. Token generation verification

**Common issues:**

- **"AI binding missing"**: Check wrangler.toml AI binding
- **"Model unavailable"**: Workers AI service may be degraded
- **"Rate limit exceeded"**: Too many AI requests

---

## Using the Health Check

### Basic Health Check

```bash
curl https://adocavo.net/api/health
```

### Formatted Output

```bash
curl https://adocavo.net/api/health | jq .
```

### Check Specific Service

```bash
# Check database status
curl https://adocavo.net/api/health | jq .checks.database

# Check AI status
curl https://adocavo.net/api/health | jq .checks.ai
```

### Get Overall Status Code

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://adocavo.net/api/health
```

### Response Time

```bash
curl -w "Response time: %{time_total}s\n" -o /dev/null -s https://adocavo.net/api/health
```

---

## Integration with Monitoring Tools

### Uptime Robot

**URL:** `https://adocavo.net/api/health`
**Method:** GET
**Interval:** 5 minutes
**Expected status:** 200
**Alert on:** Status != 200 or response time > 5000ms

### Better Uptime

**URL:** `https://adocavo.net/api/health`
**Method:** GET
**Check interval:** 1 minute
**Keyword check:** `"status":"healthy"`
**Alert threshold:** 2 consecutive failures

### StatusCake

**URL:** `https://adocavo.net/api/health`
**Check rate:** 300 seconds
**Test type:** HTTP
**Expected HTTP code:** 200
**Response time threshold:** 5000ms

### Pingdom

**URL:** `https://adocavo.net/api/health`
**Check interval:** 5 minutes
**Alert if down for:** 2 failures
**Response time threshold:** 5000ms

---

## Automated Monitoring Scripts

### Continuous Monitoring

```bash
#!/bin/bash
# monitor-health.sh - Continuous health monitoring

while true; do
  STATUS=$(curl -s https://adocavo.net/api/health | jq -r '.status')
  echo "$(date): $STATUS"

  if [ "$STATUS" != "healthy" ]; then
    echo "ALERT: Health check failed!"
    # Send alert notification
    curl -X POST "$SLACK_WEBHOOK_URL" -d "{\"text\":\"Health check failed: $STATUS\"}"
  fi

  sleep 60
done
```

### Health Check with Retries

```bash
#!/bin/bash
# health-check-retry.sh - Health check with automatic retries

MAX_ATTEMPTS=5
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://adocavo.net/api/health)

  if [ "$STATUS" = "200" ]; then
    echo "Health check passed"
    exit 0
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS failed"
  sleep 10
done

echo "Health check failed after $MAX_ATTEMPTS attempts"
exit 1
```

---

## Alerting

### Slack Alert

```bash
#!/bin/bash
# Send health check alert to Slack

STATUS=$(curl -s https://adocavo.net/api/health | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"🚨 Adocavo Health Check Failed\",
      \"attachments\": [{
        \"color\": \"danger\",
        \"fields\": [
          {\"title\": \"Status\", \"value\": \"$STATUS\", \"short\": true},
          {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": true},
          {\"title\": \"URL\", \"value\": \"https://adocavo.net/api/health\", \"short\": false}
        ]
      }]
    }"
fi
```

### Discord Alert

```bash
#!/bin/bash
# Send health check alert to Discord

STATUS=$(curl -s https://adocavo.net/api/health | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  curl -X POST "$DISCORD_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
      \"embeds\": [{
        \"title\": \"🚨 Health Check Failed\",
        \"color\": 16711680,
        \"fields\": [
          {\"name\": \"Status\", \"value\": \"$STATUS\", \"inline\": true},
          {\"name\": \"Time\", \"value\": \"$(date)\", \"inline\": true}
        ],
        \"url\": \"https://adocavo.net/api/health\"
      }]
    }"
fi
```

### Email Alert

```bash
#!/bin/bash
# Send health check alert via email

STATUS=$(curl -s https://adocavo.net/api/health | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  mail -s "🚨 Adocavo Health Check Failed" alerts@example.com <<EOF
Health check failed at $(date)

Status: $STATUS
URL: https://adocavo.net/api/health

Please investigate immediately.
EOF
fi
```

---

## Deployment Integration

### Pre-Deployment Health Check

```bash
#!/bin/bash
# Check health before deployment

HEALTH_URL="https://adocavo.net/api/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$STATUS" != "200" ]; then
  echo "❌ Pre-deployment health check failed (HTTP $STATUS)"
  echo "Deployment aborted for safety"
  exit 1
fi

echo "✅ Pre-deployment health check passed"
```

### Post-Deployment Health Check

```bash
#!/bin/bash
# Automated post-deployment health check with retries

HEALTH_URL="https://adocavo.net/api/health"
MAX_ATTEMPTS=15
ATTEMPT=0

echo "Waiting for deployment to propagate..."
sleep 45

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

  if [ "$STATUS" = "200" ]; then
    echo "✅ Post-deployment health check passed"
    curl -s "$HEALTH_URL" | jq .
    exit 0
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS: HTTP $STATUS"
  sleep 15
done

echo "❌ Post-deployment health check failed"
exit 1
```

---

## Metrics Dashboard

### Cloudflare Analytics

Access via: `https://dash.cloudflare.com` → Workers & Pages → adocavo-net → Analytics

**Key metrics:**

- Request count
- Error rate
- Response time
- CPU usage
- Memory usage

### Custom Dashboard (Grafana)

```promql
# Health check success rate
sum(rate(http_requests_total{endpoint="/api/health",status="200"}[5m])) /
sum(rate(http_requests_total{endpoint="/api/health"}[5m])) * 100

# Average response time
rate(http_request_duration_seconds_sum{endpoint="/api/health"}[5m]) /
rate(http_request_duration_seconds_count{endpoint="/api/health"}[5m])

# Database latency
avg_over_time(health_check_latency_seconds{check="database"}[5m])

# AI latency
avg_over_time(health_check_latency_seconds{check="ai"}[5m])
```

---

## Troubleshooting

### Health Check Returns 500

**Cause:** Cloudflare context or bindings missing

**Solutions:**

1. Check wrangler.toml configuration
2. Verify bindings are properly set
3. Check worker logs: `wrangler tail`

### Database Check Fails

**Cause:** D1 database unavailable or misconfigured

**Solutions:**

1. Test database directly:
   ```bash
   wrangler d1 execute adocavo-db --remote --command "SELECT 1"
   ```
2. Check database exists:
   ```bash
   wrangler d1 list
   ```
3. Verify migrations applied:
   ```bash
   wrangler d1 migrations list adocavo-db --remote
   ```

### AI Check Fails

**Cause:** Workers AI unavailable or rate limited

**Solutions:**

1. Test AI binding:
   ```bash
   wrangler ai run @cf/meta/llama-3-8b-instruct "ping"
   ```
2. Check AI model availability
3. Verify rate limits not exceeded

### Intermittent Failures

**Cause:** Network issues or service degradation

**Solutions:**

1. Increase check interval
2. Add retry logic
3. Set up alert thresholds to avoid noise

---

## Best Practices

1. **Check Regularly**: Monitor every 1-5 minutes
2. **Set Alerts**: Configure notifications for failures
3. **Use Retries**: Implement retry logic for transient failures
4. **Monitor Latency**: Track response time trends
5. **Test in Production**: Verify health check works in production
6. **Document Thresholds**: Define acceptable latency and error rates
7. **Regular Drills**: Test alerting procedures monthly
8. **Review Logs**: Check health check logs weekly for patterns

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [ROUTING_DEPLOYMENT.md](./ROUTING_DEPLOYMENT.md) - Architecture details
- `/src/app/api/health/route.ts` - Health check implementation

---

**Last Updated:** 2026-01-12
**Maintained By:** Engineering Team
