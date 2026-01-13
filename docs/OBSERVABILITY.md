# Observability & Monitoring Guide

This document describes the comprehensive observability and logging system for adocavo.net.

## Table of Contents

- [Overview](#overview)
- [Structured Logging](#structured-logging)
- [Metrics Collection](#metrics-collection)
- [Alerting](#alerting)
- [Distributed Tracing](#distributed-tracing)
- [Log Drain Integration](#log-drain-integration)
- [Admin Dashboard](#admin-dashboard)
- [Configuration](#configuration)

## Overview

The observability system provides:

- **Structured Logging**: JSON-formatted logs with correlation IDs for request tracing
- **Metrics Collection**: Real-time metrics for latency, errors, AI performance, and database operations
- **Alerting**: Configurable alerts with webhooks for critical thresholds
- **Distributed Tracing**: Request tracing across services and external APIs
- **Log Drain**: Integration with external logging services (Axiom, BetterStack, Datadog)
- **Admin Dashboard**: Real-time metrics visualization at `/admin/metrics`

## Structured Logging

### Log Levels

The system supports four log levels:

- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages for potential issues
- `error`: Error messages with stack traces

### Correlation IDs

Every request automatically gets:

- `requestId`: Unique identifier for the request
- `correlationId`: Groups related requests together
- `traceId`: Links spans across distributed systems

### Usage

```typescript
import { logInfo, logError, logWarn, logDebug } from "@/lib/logger";

// Simple logging
logInfo("User registered", { userId: "123", email: "user@example.com" });
logWarn("Rate limit approaching", { endpoint: "/api/generate", usage: 8 });
logError("Database connection failed", error, { database: "primary" });

// With context
logInfo("Processing request", {
  route: "/api/generate",
  method: "POST",
  userId: "123",
  correlationId: "abc-123",
});
```

### Request Context

Use `RequestContext` for automatic request lifecycle logging:

```typescript
import { RequestContext } from "@/lib/logger";

const context = new RequestContext(requestId, route, method);
context.logRequest(userId, ip, userAgent);
// ... process request ...
context.logResponse(200, userId, ip, userAgent);
```

## Metrics Collection

### Available Metrics

#### Request Metrics

- Latency percentiles (p50, p95, p99)
- Error rate by endpoint
- Request volume
- Status code distribution

#### AI Metrics

- Success/failure rate
- Generation duration
- Model performance
- Token usage

#### Database Metrics

- Query duration
- Error rate
- Query volume
- Rows affected

#### Business Metrics

- Credits consumption
- User registrations
- Script generations
- Hook views

### Recording Metrics

```typescript
import {
  recordRequestMetric,
  recordAIMetric,
  recordDatabaseMetric,
  recordBusinessMetric,
} from "@/lib/metrics";

// Request metric
await recordRequestMetric({
  endpoint: "/api/generate",
  method: "POST",
  statusCode: 200,
  duration: 1250,
  timestamp: Date.now(),
  userId: "123",
  success: true,
});

// AI metric
await recordAIMetric({
  success: true,
  duration: 5000,
  modelSize: "8b",
  timestamp: Date.now(),
  userId: "123",
});

// Database metric
await recordDatabaseMetric({
  query: "SELECT * FROM hooks",
  duration: 50,
  success: true,
  timestamp: Date.now(),
  rowsAffected: 10,
});

// Business metric
await recordBusinessMetric({
  type: "credits_consumed",
  value: 1,
  timestamp: Date.now(),
  userId: "123",
});
```

## Alerting

### Default Alerts

The system includes these pre-configured alerts:

| Alert Name             | Threshold | Window    | Description                    |
| ---------------------- | --------- | --------- | ------------------------------ |
| `high_error_rate`      | 5%        | 5 minutes | Error rate exceeds 5%          |
| `high_latency`         | 2s (p95)  | 5 minutes | P95 latency exceeds 2 seconds  |
| `high_ai_failure_rate` | 10%       | 5 minutes | AI failure rate exceeds 10%    |
| `high_db_error_rate`   | 1%        | 5 minutes | Database error rate exceeds 1% |

### Alert Configuration

Set up webhook notifications:

```bash
wrangler secret put ALERT_WEBHOOK_URL
# Enter your webhook URL (e.g., Slack, Discord, PagerDuty)
```

### Alert Payload

When an alert triggers, a POST request is sent to the webhook:

```json
{
  "alertName": "high_error_rate",
  "threshold": 0.05,
  "currentValue": 0.08,
  "metricType": "error_rate",
  "timestamp": "2025-01-12T10:30:00.000Z",
  "environment": "production"
}
```

## Distributed Tracing

### Tracing Requests

Trace operations across services:

```typescript
import {
  createTracer,
  createDatabaseTracer,
  createAITracer,
} from "@/lib/tracing";

const tracer = createTracer();
const dbTracer = createDatabaseTracer(tracer);
const aiTracer = createAITracer(tracer);

// Trace database query
const result = await dbTracer.traceQuery(
  "SELECT * FROM hooks",
  async () => {
    return await db.select().from(hooks);
  },
  { operation: "fetch_hooks" },
);

// Trace AI generation
const scripts = await aiTracer.traceGeneration(
  "@cf/meta/llama-3.1-8b-instruct",
  "generate_script",
  async () => {
    return await ai.run(model, inputs);
  },
  { userId: "123" },
);
```

### Observability Manager

For complete request observability:

```typescript
import { createObservabilityManager } from "@/lib/observability";

const obs = createObservabilityManager(
  "/api/generate",
  "POST",
  requestId,
  userId,
  ip,
  userAgent,
);

obs.logRequest();

// Record AI generation
obs.recordAI(true, 5000, "8b");

// Record database query
obs.recordDatabase("SELECT * FROM users", 50, true);

// Record business event
obs.recordBusiness("credits_consumed", 1);

obs.logResponse(200);
```

## Log Drain Integration

### Supported Providers

- **Generic**: Any HTTP endpoint
- **Axiom**: `https://api.axiom.co/v1/datasets/<dataset>/ingest`
- **BetterStack**: `https://in.live.betterstack.com/logs`
- **Datadog**: `https://http-intake.logs.datadoghq.com/v1/input/`

### Configuration

Set environment variables in `wrangler.toml` or secrets:

```bash
wrangler secret put LOG_DRAIN_URL
wrangler secret put LOG_DRAIN_TOKEN
```

Add to `wrangler.toml`:

```toml
[vars]
LOG_DRAIN_PROVIDER = "axiom"  # or "betterstack", "datadog", "generic"
LOG_LEVEL = "info"
```

### Dead Letter Queue

Failed log drain attempts are stored in KV and retried with exponential backoff. The queue persists up to 100 entries for 24 hours.

## Admin Dashboard

### Access

Navigate to `/admin/metrics` (requires authentication).

### Features

- **Real-time metrics**: Auto-refreshes every 30 seconds
- **Alert status**: View active/cleared alerts
- **Latency metrics**: P50, P95, P99 percentiles
- **Error rates**: By endpoint with request counts
- **AI metrics**: Success/failure rates and total generations
- **Database performance**: Query duration and error rates

### API

```bash
curl https://adocavo.net/api/admin/metrics?hours=24&type=all
```

Parameters:

- `hours`: Number of hours of history (default: 24)
- `type`: Metric type filter - `all`, `request`, `ai`, `database`, `business`

## Configuration

### Environment Variables

| Variable             | Description                | Default   |
| -------------------- | -------------------------- | --------- |
| `LOG_LEVEL`          | Minimum log level          | `info`    |
| `LOG_DRAIN_PROVIDER` | Log drain service          | `generic` |
| `LOG_DRAIN_URL`      | Log drain endpoint         | -         |
| `LOG_DRAIN_TOKEN`    | Auth token for drain       | -         |
| `ALERT_WEBHOOK_URL`  | Alert notification webhook | -         |

### Wrangler Configuration

```toml
[vars]
LOG_LEVEL = "info"
LOG_DRAIN_PROVIDER = "generic"

# Secrets (via wrangler secret put)
# LOG_DRAIN_URL
# LOG_DRAIN_TOKEN
# ALERT_WEBHOOK_URL
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// Debug: Detailed information for debugging
logDebug("Cache miss", { key: "hooks:all" });

// Info: Normal operation
logInfo("User action", { action: "generate", userId: "123" });

// Warn: Potential issues
logWarn("High memory usage", { usage: "85%" });

// Error: Errors requiring attention
logError("Payment failed", error, { userId: "123", amount: 10 });
```

### 2. Include Context

Always include relevant context in logs:

```typescript
logInfo("Script generated", {
  userId,
  hookId,
  scriptCount: scripts.length,
  modelSize: "8b",
  duration: 5000,
});
```

### 3. Use Structured Data

Avoid string interpolation, use structured objects:

```typescript
// Bad
logInfo(`User ${userId} generated ${count} scripts`);

// Good
logInfo("Scripts generated", { userId, scriptCount: count });
```

### 4. Record Metrics

Record metrics for key operations:

```typescript
import { recordAIMetric, recordBusinessMetric } from "@/lib/metrics";

const startTime = Date.now();
try {
  const scripts = await generateScripts(params);
  await recordAIMetric({
    success: true,
    duration: Date.now() - startTime,
    modelSize: "8b",
    timestamp: Date.now(),
    userId,
  });
  await recordBusinessMetric({
    type: "credits_consumed",
    value: 1,
    timestamp: Date.now(),
    userId,
  });
} catch (error) {
  await recordAIMetric({
    success: false,
    duration: Date.now() - startTime,
    errorMessage: error.message,
    timestamp: Date.now(),
    userId,
  });
}
```

### 5. Use Distributed Tracing

For complex operations, use tracing:

```typescript
const tracer = createTracer();
const parentSpan = tracer.startSpan("generate_scripts");

const dbSpan = tracer.startSpan("fetch_hooks", parentSpan);
// ... fetch hooks ...
tracer.endSpan(dbSpan);

const aiSpan = tracer.startSpan("ai_generation", parentSpan);
// ... generate with AI ...
tracer.endSpan(aiSpan);

tracer.endSpan(parentSpan);
```

## Troubleshooting

### Logs Not Appearing in External Service

1. Check `LOG_DRAIN_URL` is set correctly
2. Verify `LOG_DRAIN_TOKEN` if using authentication
3. Check `LOG_LEVEL` - ensure it's not filtering logs
4. Verify network connectivity from Cloudflare Workers

### Metrics Not Recording

1. Check KV namespace is bound: `CACHE_KV`
2. Verify KV is accessible: test with simple put/get
3. Check browser console for errors

### Alerts Not Firing

1. Verify `ALERT_WEBHOOK_URL` is set
2. Check thresholds are being exceeded
3. Review logs for alert evaluation messages
4. Test webhook URL with curl:

```bash
curl -X POST $ALERT_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"test":"alert"}'
```

## Additional Resources

- [Cloudflare Workers Monitoring](https://developers.cloudflare.com/workers/observability/)
- [Axiom Documentation](https://axiom.co/docs)
- [BetterStack Logs](https://betterstack.com/docs/logs)
- [Datadog Logging](https://docs.datadoghq.com/logs/)
