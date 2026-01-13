"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface MetricData {
  latency: {
    p50: number;
    p95: number;
    p99: number;
  } | null;
  errorRates: Record<string, { errorRate: number; totalRequests: number }>;
  aiMetrics: {
    successRate: number;
    failureRate: number;
    total: number;
  };
  dbMetrics: {
    avgDuration: number;
    errorRate: number;
    totalQueries: number;
  };
  alerts: Array<{
    alertName: string;
    triggered: boolean;
    triggerTime?: number;
    value: number;
  }>;
}

interface MetricsResponse {
  summary: MetricData;
  history: {
    request?: unknown[];
    ai?: unknown[];
    database?: unknown[];
    business?: unknown[];
  };
}

export default function MetricsDashboard() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/metrics?hours=24&type=all");
      const result = (await response.json()) as {
        success: boolean;
        data: MetricsResponse;
      };

      if (result.success) {
        setMetrics(result.data.summary);
        setError(null);
      } else {
        setError(result.data?.toString() || "Failed to fetch metrics");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchMetrics();
    }
  }, [status]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Authentication required</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">System Metrics</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number, decimals = 2) => {
    return num.toFixed(decimals);
  };

  const formatPercent = (num: number) => {
    return formatNumber(num * 100, 1) + "%";
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return formatNumber(ms, 0) + "ms";
    return formatNumber(ms / 1000, 2) + "s";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">System Metrics</h1>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {metrics && (
        <div className="space-y-8">
          {metrics.alerts && metrics.alerts.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Alerts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.alerts.map((alert) => (
                  <div
                    key={alert.alertName}
                    className={
                      "p-4 rounded-lg border-2 " +
                      (alert.triggered
                        ? "border-red-500 bg-red-50"
                        : "border-green-500 bg-green-50")
                    }
                  >
                    <h3 className="font-medium capitalize mb-2">
                      {alert.alertName.replace(/_/g, " ")}
                    </h3>
                    <p
                      className={
                        "text-2xl font-bold " +
                        (alert.triggered ? "text-red-600" : "text-green-600")
                      }
                    >
                      {alert.triggered ? "TRIGGERED" : "OK"}
                    </p>
                    {alert.triggered && alert.triggerTime && (
                      <p className="text-sm text-gray-600 mt-2">
                        Since: {new Date(alert.triggerTime).toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      Value: {formatNumber(alert.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Request Latency</h2>
            {metrics.latency ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-2">P50 Latency</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatDuration(metrics.latency.p50)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 mb-2">P95 Latency</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {formatDuration(metrics.latency.p95)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 mb-2">P99 Latency</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatDuration(metrics.latency.p99)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No latency data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Error Rates by Endpoint
            </h2>
            {Object.keys(metrics.errorRates).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(metrics.errorRates).map(([endpoint, data]) => (
                  <div key={endpoint} className="border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {endpoint}
                      </code>
                      <span
                        className={
                          "font-bold " +
                          (data.errorRate > 0.05
                            ? "text-red-600"
                            : "text-green-600")
                        }
                      >
                        {formatPercent(data.errorRate)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {data.totalRequests} total requests
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No error data available</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              AI Generation Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-gray-600 mb-2">Total Generations</p>
                <p className="text-3xl font-bold">{metrics.aiMetrics.total}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-2">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatPercent(metrics.aiMetrics.successRate)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-2">Failure Rate</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatPercent(metrics.aiMetrics.failureRate)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Database Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-gray-600 mb-2">Total Queries</p>
                <p className="text-3xl font-bold">
                  {metrics.dbMetrics.totalQueries}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-2">Avg Duration</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatDuration(metrics.dbMetrics.avgDuration)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-2">Error Rate</p>
                <p
                  className={
                    "text-3xl font-bold " +
                    (metrics.dbMetrics.errorRate > 0.01
                      ? "text-red-600"
                      : "text-green-600")
                  }
                >
                  {formatPercent(metrics.dbMetrics.errorRate)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <span className="text-gray-700">Auto-refresh (30s)</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
                (autoRefresh ? "bg-blue-600" : "bg-gray-200")
              }
            >
              <span
                className={
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                  (autoRefresh ? "translate-x-6" : "translate-x-1")
                }
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
