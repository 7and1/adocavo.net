import {
  withAuthHandler,
  successResponse,
  type RouteContext,
} from "@/lib/api-utils";
import { requireAdmin } from "@/lib/admin";
import { adminHookUpdateSchema } from "@/lib/validations";
import { hooks } from "@/lib/schema";
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

    const parsed = adminHookUpdateSchema.parse(body);
    if (Object.keys(parsed).length === 0) {
      throw new ValidationError("No updates provided");
    }

    const existing = await db.query.hooks.findFirst({
      where: eq(hooks.id, id),
    });

    if (!existing) {
      throw new NotFoundError("Hook not found");
    }

    const updates: Partial<typeof hooks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.text !== undefined) updates.text = parsed.text;
    if (parsed.category !== undefined) updates.category = parsed.category;
    if (parsed.engagementScore !== undefined) {
      updates.engagementScore = parsed.engagementScore;
    }
    if (parsed.source !== undefined) updates.source = parsed.source ?? null;
    if (parsed.isActive !== undefined) updates.isActive = parsed.isActive;

    await db.update(hooks).set(updates).where(eq(hooks.id, id));

    const updated = await db.query.hooks.findFirst({
      where: eq(hooks.id, id),
    });

    return successResponse(updated);
  },
);

export const DELETE = withAuthHandler(
  async (request: Request, context?: unknown) => {
    const { id } = await (context as RouteContext<{ id: string }>).params;
    const session =
      (request as Request & { session?: Session }).session ?? null;
    const { db } = await requireAdmin(session);

    const existing = await db.query.hooks.findFirst({
      where: eq(hooks.id, id),
    });

    if (!existing) {
      throw new NotFoundError("Hook not found");
    }

    await db
      .update(hooks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(hooks.id, id));

    const updated = await db.query.hooks.findFirst({
      where: eq(hooks.id, id),
    });

    return successResponse(updated);
  },
);
