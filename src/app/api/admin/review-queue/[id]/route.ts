import {
  withAuthHandler,
  successResponse,
  type RouteContext,
} from "@/lib/api-utils";
import { requireAdmin } from "@/lib/admin";
import { reviewQueueUpdateSchema } from "@/lib/validations";
import { hookReviewQueue, hooks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

export const PATCH = withAuthHandler(
  async (request: Request, context?: unknown) => {
    const { id } = await (context as RouteContext<{ id: string }>).params;
    const session =
      (request as Request & { session?: Session }).session ?? null;
    const { db } = await requireAdmin(session);

    const body = await request.json().catch(() => {
      throw new ValidationError();
    });
    const parsed = reviewQueueUpdateSchema.parse(body);
    if (Object.keys(parsed).length === 0) {
      throw new ValidationError("No updates provided");
    }

    const existing = await db.query.hookReviewQueue.findFirst({
      where: eq(hookReviewQueue.id, id),
    });

    if (!existing) {
      throw new NotFoundError("Review item not found");
    }

    const updates: Partial<typeof hookReviewQueue.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.text !== undefined) updates.text = parsed.text;
    if (parsed.category !== undefined) updates.category = parsed.category;
    if (parsed.engagementScore !== undefined) {
      updates.engagementScore = parsed.engagementScore;
    }
    if (parsed.source !== undefined) updates.source = parsed.source ?? null;
    if (parsed.notes !== undefined) updates.notes = parsed.notes ?? null;

    if (parsed.status !== undefined) {
      updates.status = parsed.status;

      if (parsed.status === "approved" || parsed.status === "rejected") {
        updates.reviewerId = session?.user?.id ?? null;
        updates.reviewedAt = new Date();
      }

      if (parsed.status === "pending") {
        updates.reviewerId = null;
        updates.reviewedAt = null;
      }
    }

    await db
      .update(hookReviewQueue)
      .set(updates)
      .where(eq(hookReviewQueue.id, id));

    let hookRecord = undefined;
    const shouldPublish =
      parsed.status === "approved" && parsed.publish !== false;

    if (shouldPublish) {
      const now = new Date();
      const hookPayload = {
        id: existing.id,
        text: parsed.text ?? existing.text,
        category: parsed.category ?? existing.category,
        engagementScore: parsed.engagementScore ?? existing.engagementScore,
        source: parsed.source ?? existing.source ?? "review_queue",
        isActive: true,
        createdAt: existing.createdAt ?? now,
        updatedAt: now,
      };

      await db
        .insert(hooks)
        .values(hookPayload)
        .onConflictDoUpdate({
          target: hooks.id,
          set: {
            text: hookPayload.text,
            category: hookPayload.category,
            engagementScore: hookPayload.engagementScore,
            source: hookPayload.source,
            isActive: true,
            updatedAt: now,
          },
        });

      hookRecord = await db.query.hooks.findFirst({
        where: eq(hooks.id, existing.id),
      });
    }

    const updatedQueue = await db.query.hookReviewQueue.findFirst({
      where: eq(hookReviewQueue.id, id),
    });

    return successResponse({
      queueItem: updatedQueue,
      hook: hookRecord,
    });
  },
);
