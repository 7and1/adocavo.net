import { withAuthHandler, successResponse } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/admin";
import {
  reviewQueueBulkSchema,
  reviewQueueQuerySchema,
} from "@/lib/validations";
import { hookReviewQueue } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

export const GET = withAuthHandler(async (request: Request) => {
  const session = (request as Request & { session?: Session }).session ?? null;
  const { db } = await requireAdmin(session);

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = reviewQueueQuerySchema.parse(params);

  const whereClauses = [];

  if (parsed.status) {
    whereClauses.push(eq(hookReviewQueue.status, parsed.status));
  }

  if (parsed.category) {
    whereClauses.push(eq(hookReviewQueue.category, parsed.category));
  }

  if (parsed.search) {
    const escapedSearch = parsed.search
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/\\/g, "\\\\");
    whereClauses.push(
      sql`${hookReviewQueue.text} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'`,
    );
  }

  const where =
    whereClauses.length > 1
      ? and(...whereClauses)
      : whereClauses.length === 1
        ? whereClauses[0]
        : undefined;

  const data = await db.query.hookReviewQueue.findMany({
    where,
    orderBy: [desc(hookReviewQueue.createdAt)],
    limit: parsed.limit,
  });

  return successResponse(data);
});

export const POST = withAuthHandler(async (request: Request) => {
  const session = (request as Request & { session?: Session }).session ?? null;
  const { db } = await requireAdmin(session);

  const body = await request.json();
  const parsed = reviewQueueBulkSchema.parse(body);
  const items = Array.isArray(parsed) ? parsed : [parsed];

  const now = new Date();
  const rows = items.map((item) => ({
    id: `queue_${nanoid(10)}`,
    text: item.text,
    category: item.category,
    engagementScore: item.engagementScore,
    source: item.source ?? "review_queue",
    status: "pending" as const,
    notes: item.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(hookReviewQueue).values(rows);

  return successResponse(rows, 201);
});
