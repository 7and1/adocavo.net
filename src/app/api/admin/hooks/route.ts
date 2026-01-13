import { withAuthHandler, successResponse } from "@/lib/api-utils";
import { requireAdmin } from "@/lib/admin";
import {
  adminHookCreateSchema,
  adminHooksQuerySchema,
} from "@/lib/validations";
import { hooks } from "@/lib/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

export const GET = withAuthHandler(async (request: Request) => {
  const session = (request as Request & { session?: Session }).session ?? null;
  const { db } = await requireAdmin(session);

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = adminHooksQuerySchema.parse(params);

  const whereClauses = [];

  if (parsed.status !== "all") {
    whereClauses.push(eq(hooks.isActive, parsed.status === "active"));
  }

  if (parsed.category) {
    whereClauses.push(eq(hooks.category, parsed.category));
  }

  if (parsed.search) {
    const escapedSearch = parsed.search
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/\\/g, "\\\\");
    whereClauses.push(
      sql`${hooks.text} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'`,
    );
  }

  const where =
    whereClauses.length > 1
      ? and(...whereClauses)
      : whereClauses.length === 1
        ? whereClauses[0]
        : undefined;

  const data = await db.query.hooks.findMany({
    where,
    orderBy: [desc(hooks.updatedAt), desc(hooks.createdAt)],
    limit: parsed.limit,
  });

  return successResponse(data);
});

export const POST = withAuthHandler(async (request: Request) => {
  const session = (request as Request & { session?: Session }).session ?? null;
  const { db } = await requireAdmin(session);

  const body = await request.json();
  const parsed = adminHookCreateSchema.parse(body);

  const id = `hook_${nanoid(10)}`;
  const now = new Date();

  await db.insert(hooks).values({
    id,
    text: parsed.text,
    category: parsed.category,
    engagementScore: parsed.engagementScore,
    source: parsed.source ?? "manual_curation",
    isActive: parsed.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.query.hooks.findFirst({
    where: eq(hooks.id, id),
  });

  return successResponse(created, 201);
});
