import { getKV, getBindings } from "./cloudflare";
import { logInfo, logWarn, logError } from "./logger";

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface RequestMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userId?: string;
  ip?: string;
  success: boolean;
}

export interface AIMetrics {
  success: boolean;
  duration: number;
  modelSize?: string;
  tokensUsed?: number;
  errorMessage?: string;
  timestamp: number;
  userId?: string;
}

export interface DatabaseMetrics {
  query: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
  rowsAffected?: number;
}

export interface BusinessMetrics {
  type:
    | "credits_consumed"
    | "user_registration"
    | "script_generation"
    | "hook_view";
  value: number;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AlertConfig {
  name: string;
  threshold: number;
  windowMs: number;
  metricType: "error_rate" | "latency" | "ai_failure" | "db_error";
  enabled: boolean;
}

export interface AlertState {
  alertName: string;
  triggered: boolean;
  triggerTime?: number;
  value: number;
  lastCheck: number;
}

const METRICS_KEY_PREFIX = "metrics:";
const ALERTS_KEY_PREFIX = "alerts:";
const METRICS_RETENTION_HOURS = 24 * 7; // 7 days

class MetricsCollector {
  private requestLatencies: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private aiSuccesses: number = 0;
  private aiFailures: number = 0;
  private dbQueryTimes: number[] = [];
  private dbErrorCount: number = 0;
  private rateLimitHits: number = 0;

  private alertStates: Map<string, AlertState> = new Map();
  private alertConfigs: AlertConfig[] = [
    {
      name: "high_error_rate",
      threshold: 0.05,
      windowMs: 5 * 60 * 1000,
      metricType: "error_rate",
      enabled: true,
    },
    {
      name: "high_latency",
      threshold: 2000,
      windowMs: 5 * 60 * 1000,
      metricType: "latency",
      enabled: true,
    },
    {
      name: "high_ai_failure_rate",
      threshold: 0.1,
      windowMs: 5 * 60 * 1000,
      metricType: "ai_failure",
      enabled: true,
    },
    {
      name: "high_db_error_rate",
      threshold: 0.01,
      windowMs: 5 * 60 * 1000,
      metricType: "db_error",
      enabled: true,
    },
  ];

  constructor() {
    this.loadAlertStates();
  }

  private async loadAlertStates() {
    try {
      const kv = getKV();
      if (!kv) return;

      const data = await kv.get(`${ALERTS_KEY_PREFIX}states`);
      if (data) {
        const states = JSON.parse(data) as Record<string, AlertState>;
        this.alertStates = new Map(Object.entries(states));
      }
    } catch (error) {
      logError("Failed to load alert states", error);
    }
  }

  private async saveAlertStates() {
    try {
      const kv = getKV();
      if (!kv) return;

      const states = Object.fromEntries(this.alertStates);
      await kv.put(`${ALERTS_KEY_PREFIX}states`, JSON.stringify(states), {
        expirationTtl: 86400,
      });
    } catch (error) {
      logError("Failed to save alert states", error);
    }
  }

  async recordRequestMetric(metric: RequestMetrics) {
    const key = `${metric.method}:${metric.endpoint}`;

    this.requestLatencies.set(
      key,
      [...(this.requestLatencies.get(key) || []), metric.duration].slice(-1000),
    );

    if (!metric.success) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }

    await this.persistMetric("request", metric);
    await this.checkAlerts();
  }

  async recordAIMetric(metric: AIMetrics) {
    if (metric.success) {
      this.aiSuccesses++;
    } else {
      this.aiFailures++;
    }

    await this.persistMetric("ai", metric);
    await this.checkAlerts();
  }

  async recordDatabaseMetric(metric: DatabaseMetrics) {
    this.dbQueryTimes.push(metric.duration);
    if (this.dbQueryTimes.length > 1000) {
      this.dbQueryTimes = this.dbQueryTimes.slice(-1000);
    }

    if (!metric.success) {
      this.dbErrorCount++;
    }

    await this.persistMetric("database", metric);
    await this.checkAlerts();
  }

  async recordBusinessMetric(metric: BusinessMetrics) {
    await this.persistMetric("business", metric);
  }

  recordRateLimitHit(endpoint: string) {
    this.rateLimitHits++;
    logInfo("Rate limit hit", { endpoint, totalHits: this.rateLimitHits });
  }

  private async persistMetric(
    type: string,
    metric: RequestMetrics | AIMetrics | DatabaseMetrics | BusinessMetrics,
  ) {
    try {
      const kv = getKV();
      if (!kv) return;

      const timestamp = Date.now();
      const hourKey = Math.floor(timestamp / (60 * 60 * 1000));
      const key = `${METRICS_KEY_PREFIX}${type}:${hourKey}`;

      const existing = await kv.get(key);
      const metrics = existing ? JSON.parse(existing) : [];

      metrics.push({ ...metric, timestamp });

      await kv.put(key, JSON.stringify(metrics), {
        expirationTtl: METRICS_RETENTION_HOURS * 60 * 60,
      });
    } catch (error) {
      logError("Failed to persist metric", error, { metricType: type });
    }
  }

  private async checkAlerts() {
    const now = Date.now();

    for (const config of this.alertConfigs) {
      if (!config.enabled) continue;

      const state = this.alertStates.get(config.name) || {
        alertName: config.name,
        triggered: false,
        triggerTime: undefined as number | undefined,
        value: 0,
        lastCheck: now,
      };

      const shouldAlert = await this.evaluateAlert(config);

      if (shouldAlert && !state.triggered) {
        state.triggered = true;
        state.triggerTime = now;
        state.lastCheck = now;

        await this.triggerAlert(config, state.value);
        logWarn("Alert triggered", {
          alertName: config.name,
          threshold: config.threshold,
          currentValue: state.value,
        });
      } else if (!shouldAlert && state.triggered) {
        state.triggered = false;
        state.lastCheck = now;

        logInfo("Alert cleared", {
          alertName: config.name,
          threshold: config.threshold,
          currentValue: state.value,
        });
      }

      state.lastCheck = now;
      this.alertStates.set(config.name, state);
    }

    await this.saveAlertStates();
  }

  private async evaluateAlert(config: AlertConfig): Promise<boolean> {
    // const now = Date.now(); // Prepared for future time-window filtering
    // const windowStart = now - config.windowMs; // Prepared for future time-window filtering

    switch (config.metricType) {
      case "error_rate": {
        let totalRequests = 0;
        let errorCount = 0;

        for (const [key, errors] of this.errorCounts) {
          totalRequests += (this.requestLatencies.get(key) || []).length;
          errorCount += errors;
        }

        if (totalRequests === 0) return false;
        const errorRate = errorCount / totalRequests;
        this.alertStates.get(config.name)!.value = errorRate;
        return errorRate > config.threshold;
      }

      case "latency": {
        const allLatencies = Array.from(this.requestLatencies.values()).flat();
        if (allLatencies.length === 0) return false;

        const sorted = [...allLatencies].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p95 = sorted[p95Index] || 0;

        this.alertStates.get(config.name)!.value = p95;
        return p95 > config.threshold;
      }

      case "ai_failure": {
        const total = this.aiSuccesses + this.aiFailures;
        if (total === 0) return false;

        const failureRate = this.aiFailures / total;
        this.alertStates.get(config.name)!.value = failureRate;
        return failureRate > config.threshold;
      }

      case "db_error": {
        const total = this.dbQueryTimes.length + this.dbErrorCount;
        if (total === 0) return false;

        const errorRate = this.dbErrorCount / total;
        this.alertStates.get(config.name)!.value = errorRate;
        return errorRate > config.threshold;
      }

      default:
        return false;
    }
  }

  private async triggerAlert(config: AlertConfig, currentValue: number) {
    const webhookUrl = getBindings().ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      logWarn("Alert triggered but no webhook URL configured", {
        alertName: config.name,
        currentValue,
        threshold: config.threshold,
      });
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertName: config.name,
          threshold: config.threshold,
          currentValue,
          metricType: config.metricType,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "unknown",
        }),
      });
    } catch (error) {
      logError("Failed to send alert webhook", error, {
        alertName: config.name,
      });
    }
  }

  getLatencyPercentiles(
    endpoint?: string,
  ): { p50: number; p95: number; p99: number } | null {
    let latencies: number[] = [];

    if (endpoint) {
      for (const [key, times] of this.requestLatencies) {
        if (key.includes(endpoint)) {
          latencies.push(...times);
        }
      }
    } else {
      latencies = Array.from(this.requestLatencies.values()).flat();
    }

    if (latencies.length === 0) return null;

    const sorted = [...latencies].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }

  getErrorRateByEndpoint(): Record<
    string,
    { errorRate: number; totalRequests: number }
  > {
    const result: Record<string, { errorRate: number; totalRequests: number }> =
      {};

    for (const [key, latencies] of this.requestLatencies) {
      const errors = this.errorCounts.get(key) || 0;
      const total = latencies.length;
      result[key] = {
        errorRate: total > 0 ? errors / total : 0,
        totalRequests: total,
      };
    }

    return result;
  }

  getAIFailureRate(): {
    successRate: number;
    failureRate: number;
    total: number;
  } {
    const total = this.aiSuccesses + this.aiFailures;
    return {
      successRate: total > 0 ? this.aiSuccesses / total : 1,
      failureRate: total > 0 ? this.aiFailures / total : 0,
      total,
    };
  }

  getDatabasePerformance(): {
    avgDuration: number;
    errorRate: number;
    totalQueries: number;
  } {
    const totalQueries = this.dbQueryTimes.length + this.dbErrorCount;
    const avgDuration =
      this.dbQueryTimes.length > 0
        ? this.dbQueryTimes.reduce((a, b) => a + b, 0) /
          this.dbQueryTimes.length
        : 0;

    return {
      avgDuration,
      errorRate: totalQueries > 0 ? this.dbErrorCount / totalQueries : 0,
      totalQueries,
    };
  }

  getAlertStates(): AlertState[] {
    return Array.from(this.alertStates.values());
  }

  async getMetricsHistory(
    type: string,
    hours: number = 24,
  ): Promise<
    (RequestMetrics | AIMetrics | DatabaseMetrics | BusinessMetrics)[]
  > {
    try {
      const kv = getKV();
      if (!kv) return [];

      const now = Date.now();
      const metrics: (
        | RequestMetrics
        | AIMetrics
        | DatabaseMetrics
        | BusinessMetrics
      )[] = [];

      for (let i = 0; i < hours; i++) {
        const hourTimestamp = now - i * 60 * 60 * 1000;
        const hourKey = Math.floor(hourTimestamp / (60 * 60 * 1000));
        const key = `${METRICS_KEY_PREFIX}${type}:${hourKey}`;

        const data = await kv.get(key);
        if (data) {
          const hourMetrics = JSON.parse(data);
          metrics.push(...hourMetrics);
        }
      }

      return metrics;
    } catch (error) {
      logError("Failed to get metrics history", error, { type, hours });
      return [];
    }
  }
}

let collectorInstance: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!collectorInstance) {
    collectorInstance = new MetricsCollector();
  }
  return collectorInstance;
}

export function recordRequestMetric(metric: RequestMetrics) {
  return getMetricsCollector().recordRequestMetric(metric);
}

export function recordAIMetric(metric: AIMetrics) {
  return getMetricsCollector().recordAIMetric(metric);
}

export function recordDatabaseMetric(metric: DatabaseMetrics) {
  return getMetricsCollector().recordDatabaseMetric(metric);
}

export function recordBusinessMetric(metric: BusinessMetrics) {
  return getMetricsCollector().recordBusinessMetric(metric);
}

export function recordRateLimitHit(endpoint: string) {
  return getMetricsCollector().recordRateLimitHit(endpoint);
}
