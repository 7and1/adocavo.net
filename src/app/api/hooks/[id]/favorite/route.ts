import {
  withErrorHandler,
  successResponse,
  type RouteContext,
} from "@/lib/api-utils";
import { AuthRequiredError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { getDB, getD1 } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { nanoid } from "nanoid";
import { scriptFavorites, generatedScripts, hooks } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(
  async (request: Request, context?: unknown) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AuthRequiredError();
    }

    const params = await (context as RouteContext<{ id: string }>)?.params;
    const { id: hookId } = params ?? { id: "" };

    const d1 = getD1();
    const db = createDb(d1);

    // Check if user has favorited any generated scripts for this hook
    const favorite = await db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, session.user.id),
        eq(generatedScripts.hookId, hookId),
      ),
      with: {
        generatedScript: {
          with: {
            hook: true,
          },
        },
      },
    });

    return successResponse({
      isFavorited: !!favorite,
      favoriteId: favorite?.id,
    });
  },
);

export const POST = withErrorHandler(
  async (request: Request, context?: unknown) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AuthRequiredError();
    }

    const params = await (context as RouteContext<{ id: string }>)?.params;
    const { id: hookId } = params ?? { id: "" };

    const db = getDB();

    // Rate limit using user ID for authenticated users
    const { identifier, tier } = await getRateLimitContext(request, session);
    const rate = await checkRateLimit(db, identifier, "favorites", tier);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many favorite actions. Please try again later.",
            retryAfter: rate.retryAfter,
          },
        },
        { status: 429 },
      );
    }

    // Find the hook first
    const hook = await db.query.hooks.findFirst({
      where: eq(hooks.id, hookId),
    });

    if (!hook) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Hook not found",
          },
        },
        { status: 404 },
      );
    }

    // Check if user already has favorited this hook
    const existingFavorite = await db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, session.user.id),
        eq(generatedScripts.hookId, hookId),
      ),
      with: {
        generatedScript: true,
      },
    });

    if (existingFavorite) {
      return successResponse({
        id: existingFavorite.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        generatedScriptId: (existingFavorite as any).generatedScript?.id,
      });
    }

    // For now, create a simple favorite marker by creating a minimal generated script
    // In a real implementation, you might want a separate hook_favorites table
    const generatedScriptId = nanoid();
    await db.insert(generatedScripts).values({
      id: generatedScriptId,
      userId: session.user.id,
      hookId: hookId,
      productDescription: `Favorite: ${hook.text}`,
      scripts: JSON.stringify([{ angle: "Favorite", script: hook.text }]),
    });

    const favoriteId = nanoid();
    await db.insert(scriptFavorites).values({
      id: favoriteId,
      userId: session.user.id,
      generatedScriptId: generatedScriptId,
    });

    return successResponse({
      id: favoriteId,
      generatedScriptId,
    });
  },
);

export const DELETE = withErrorHandler(
  async (request: Request, context?: unknown) => {
    const session = await auth();

    if (!session?.user?.id) {
      throw new AuthRequiredError();
    }

    const params = await (context as RouteContext<{ id: string }>)?.params;
    const { id: hookId } = params ?? { id: "" };

    const db = getDB();

    // Rate limit using user ID for authenticated users
    const { identifier, tier } = await getRateLimitContext(request, session);
    const rate = await checkRateLimit(db, identifier, "favorites", tier);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many favorite actions. Please try again later.",
            retryAfter: rate.retryAfter,
          },
        },
        { status: 429 },
      );
    }

    // Find and delete the favorite
    const favorite = await db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, session.user.id),
        eq(generatedScripts.hookId, hookId),
      ),
      with: {
        generatedScript: true,
      },
    });

    if (favorite) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const generatedScriptId = (favorite as any).generatedScript?.id;
      await db
        .delete(scriptFavorites)
        .where(eq(scriptFavorites.id, favorite.id));
      if (generatedScriptId) {
        await db
          .delete(generatedScripts)
          .where(eq(generatedScripts.id, generatedScriptId));
      }
    }

    return successResponse({ success: true });
  },
);
