import {
  withErrorHandler,
  successResponse,
  validateCSRF,
  type RouteContext,
} from "@/lib/api-utils";
import {
  AuthRequiredError,
  ValidationError,
  NotFoundError,
  CreditsError,
} from "@/lib/errors";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { users, generatedScripts } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { AI_CONFIG, SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import { regenerateRequestSchema } from "@/lib/validations";
import { NextResponse } from "next/server";

interface Script {
  angle: "Pain Point" | "Benefit" | "Social Proof";
  script: string;
}

const ANGLE_PROMPTS = {
  "Pain Point": "Generate ONLY a Pain Point angle script.",
  Benefit: "Generate ONLY a Benefit angle script.",
  "Social Proof": "Generate ONLY a Social Proof angle script.",
};

export const POST = withErrorHandler(
  async (request: Request, context?: unknown) => {
    const { id } = await (context as RouteContext<{ id: string }>).params;
    const session = await auth();

    if (!session?.user?.id) {
      throw new AuthRequiredError();
    }

    // Validate CSRF for authenticated state-changing requests
    if (!validateCSRF(request, true)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CSRF_ERROR",
            message: "Invalid origin. Please refresh and try again.",
          },
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => {
      throw new ValidationError();
    });

    const parsed = regenerateRequestSchema.parse(body);
    const env = getBindings();

    if (!env.DB || !env.AI) {
      throw new Error("AI/DB bindings missing");
    }

    const db = createDb(env.DB as D1Database);

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user || user.credits < 1) {
      throw new CreditsError();
    }

    const existingScript = await db.query.generatedScripts.findFirst({
      where: eq(generatedScripts.id, id),
      with: {
        hook: true,
      },
    });

    if (!existingScript || existingScript.userId !== session.user.id) {
      throw new NotFoundError("Script not found");
    }

    const hook = existingScript.hook;

    const deductResult = await db
      .update(users)
      .set({ credits: sql`credits - 1`, updatedAt: new Date() })
      .where(sql`${users.id} = ${session.user.id} AND ${users.credits} >= 1`)
      .returning({ credits: users.credits });

    if (deductResult.length === 0) {
      throw new CreditsError();
    }

    try {
      const anglePrompt = ANGLE_PROMPTS[parsed.angle];
      const response = await (env.AI as Ai).run(AI_CONFIG.model, {
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\n${anglePrompt}` },
          {
            role: "user",
            content: buildUserPrompt(
              hook.text,
              existingScript.productDescription,
            ),
          },
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.max_tokens,
      });

      const content = response.response || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        await db
          .update(users)
          .set({ credits: sql`credits + 1`, updatedAt: new Date() })
          .where(eq(users.id, session.user.id));
        throw new Error("Failed to parse AI response");
      }

      const aiParsed = JSON.parse(jsonMatch[0]) as { scripts?: Script[] };

      if (
        !aiParsed.scripts ||
        !Array.isArray(aiParsed.scripts) ||
        aiParsed.scripts.length !== 1
      ) {
        await db
          .update(users)
          .set({ credits: sql`credits + 1`, updatedAt: new Date() })
          .where(eq(users.id, session.user.id));
        throw new Error("Invalid AI response");
      }

      const currentScripts = existingScript.scripts as Script[];
      const angleIndex = currentScripts.findIndex(
        (s) => s.angle === parsed.angle,
      );

      if (angleIndex >= 0) {
        currentScripts[angleIndex] = aiParsed.scripts[0];
      } else {
        currentScripts.push(aiParsed.scripts[0]);
      }

      await db
        .update(generatedScripts)
        .set({ scripts: JSON.stringify(currentScripts) })
        .where(eq(generatedScripts.id, id));

      return successResponse({
        script: aiParsed.scripts[0],
        creditsRemaining: deductResult[0].credits,
      });
    } catch (error) {
      await db
        .update(users)
        .set({ credits: sql`credits + 1`, updatedAt: new Date() })
        .where(eq(users.id, session.user.id));
      throw error;
    }
  },
);
