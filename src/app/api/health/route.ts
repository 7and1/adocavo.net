import { NextResponse } from "next/server";
import { getCloudflareContext, type EnvBindings } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  let ctx;
  try {
    ctx = await getCloudflareContext();
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Cloudflare Context missing",
      },
      { status: 500 },
    );
  }

  if (!ctx?.env) {
    return NextResponse.json(
      { status: "error", message: "Cloudflare Context missing" },
      { status: 500 },
    );
  }

  const { DB, AI } = ctx.env as EnvBindings;
  const checks: Record<
    string,
    { status: "healthy" | "error"; latency?: number; details?: string }
  > = {};

  if (DB) {
    try {
      const dbStart = Date.now();
      await DB.prepare("SELECT 1 as ping").all();
      await DB.prepare(
        "UPDATE rate_limits SET updated_at = updated_at WHERE 1 = 0",
      ).run();
      checks.database = { status: "healthy", latency: Date.now() - dbStart };
    } catch (error) {
      checks.database = {
        status: "error",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    checks.database = { status: "error", details: "DB binding missing" };
  }

  if (AI) {
    try {
      const aiStart = Date.now();
      await AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      });
      checks.ai = { status: "healthy", latency: Date.now() - aiStart };
    } catch (error) {
      checks.ai = {
        status: "error",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    checks.ai = { status: "error", details: "AI binding missing" };
  }

  const status = Object.values(checks).some((check) => check.status === "error")
    ? 500
    : 200;

  return NextResponse.json(
    {
      status: status === 200 ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      runtime: process.env.NEXT_RUNTIME || "nodejs",
      latency: Date.now() - start,
      checks,
    },
    { status },
  );
}
