import { NextResponse } from "next/server";
import { withAuthHandler } from "@/lib/api-utils";
import { getMetricsCollector } from "@/lib/metrics";
import { logError } from "@/lib/logger";

export const GET = withAuthHandler(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const hours = Number.parseInt(url.searchParams.get("hours") || "24", 10);
    const type = url.searchParams.get("type") || "all";

    const collector = getMetricsCollector();

    const latency = collector.getLatencyPercentiles();
    const errorRates = collector.getErrorRateByEndpoint();
    const aiMetrics = collector.getAIFailureRate();
    const dbMetrics = collector.getDatabasePerformance();
    const alerts = collector.getAlertStates();

    const history: Record<string, unknown[]> = {};
    if (type === "all" || type === "request") {
      history.request = await collector.getMetricsHistory("request", hours);
    }
    if (type === "all" || type === "ai") {
      history.ai = await collector.getMetricsHistory("ai", hours);
    }
    if (type === "all" || type === "database") {
      history.database = await collector.getMetricsHistory("database", hours);
    }
    if (type === "all" || type === "business") {
      history.business = await collector.getMetricsHistory("business", hours);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          latency,
          errorRates,
          aiMetrics,
          dbMetrics,
          alerts,
        },
        history,
      },
    });
  } catch (error) {
    logError("Failed to fetch metrics", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "METRICS_ERROR",
          message: "Failed to fetch metrics",
        },
      },
      { status: 500 },
    );
  }
});
