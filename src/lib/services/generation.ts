import {
  AI_CONFIG,
  SYSTEM_PROMPT,
  buildUserPrompt,
  validateScriptOutput,
} from "../prompts";
import { withAiProtection } from "../timeout";
import { createDb, type Database } from "../db";
import { users, generatedScripts, hooks } from "../schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { logError } from "../logger";
import { withDbQuery, withTransaction } from "../db-utils";
import { dbGeneratedScriptSchema } from "../validations";

export interface Script {
  angle: "Pain Point" | "Benefit" | "Social Proof";
  script: string;
}

/**
 * Strict validation for AI-generated script responses.
 * Prevents injection of malicious content via malformed AI responses.
 */
function isValidScript(obj: unknown): obj is Script {
  if (!obj || typeof obj !== "object") return false;

  const s = obj as Record<string, unknown>;

  // Validate angle
  if (
    typeof s.angle !== "string" ||
    !["Pain Point", "Benefit", "Social Proof"].includes(s.angle)
  ) {
    return false;
  }

  // Validate script
  if (typeof s.script !== "string") return false;
  if (s.script.length < 10 || s.script.length > 2000) return false;

  // Check for potential script injection in the script content
  const dangerousPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onload=, etc.
    /<iframe/i,
    /eval\s*\(/i,
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(s.script)) {
      return false;
    }
  }

  return true;
}

function validateScriptsArray(scripts: unknown): scripts is Script[] {
  if (!Array.isArray(scripts)) return false;
  if (scripts.length !== 3) return false;

  // Check for duplicate angles
  const angles = new Set<string>();
  for (const script of scripts) {
    if (!isValidScript(script)) return false;
    if (angles.has(script.angle)) return false; // Duplicate angle
    angles.add(script.angle);
  }

  // Ensure all three required angles are present
  const requiredAngles = new Set(["Pain Point", "Benefit", "Social Proof"]);
  for (const angle of requiredAngles) {
    if (!angles.has(angle)) return false;
  }

  return true;
}

async function callAiForScripts(
  ai: Ai,
  hook: string,
  productDescription: string,
  remixInstruction?: string,
  remixTone?: string,
): Promise<
  | { success: true; scripts: Script[] }
  | { success: false; error: GenerationErrorCode; message: string }
> {
  try {
    // Wrap AI call with timeout and circuit breaker protection
    const response = await withAiProtection(
      async () =>
        ai.run(AI_CONFIG.model, {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: buildUserPrompt(
                hook,
                productDescription,
                remixInstruction,
                remixTone,
              ),
            },
          ],
          temperature: AI_CONFIG.temperature,
          max_tokens: AI_CONFIG.max_tokens,
        }),
      30000, // 30 second timeout for AI calls
    );

    const content = response.response || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: "Failed to parse AI response",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { scripts?: Script[] };

    // Double validation: both structure and content safety
    const validation = validateScriptOutput(parsed);
    if (!validation.valid) {
      logError("AI output validation failed", new Error(validation.error), {
        hook,
        productDescription,
      });
      return {
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: validation.error || "Invalid AI output",
      };
    }

    if (!parsed.scripts || !Array.isArray(parsed.scripts)) {
      return {
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: "Scripts missing in AI response",
      };
    }

    if (!validateScriptsArray(parsed.scripts)) {
      return {
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: "Invalid script structure or content",
      };
    }

    return { success: true, scripts: parsed.scripts };
  } catch (error) {
    logError("AI error", error, { hook, productDescription });
    return {
      success: false,
      error: "AI_UNAVAILABLE",
      message: "AI service unavailable",
    };
  }
}

export interface GenerationInput {
  userId: string;
  hookId: string;
  productDescription: string;
  remixTone?: string;
  remixInstruction?: string;
}

export interface GenerationSuccess {
  success: true;
  scripts: Script[];
  creditsRemaining: number;
  generationId: string;
}

export interface GenerationError {
  success: false;
  error: GenerationErrorCode;
  message: string;
}

export type GenerationErrorCode =
  | "INSUFFICIENT_CREDITS"
  | "HOOK_NOT_FOUND"
  | "AI_UNAVAILABLE"
  | "INVALID_AI_RESPONSE"
  | "DATABASE_ERROR";

export type GenerationResult = GenerationSuccess | GenerationError;

export class GenerationService {
  constructor(
    private readonly ai: Ai,
    private readonly db: Database,
  ) {}

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const { userId, hookId, productDescription, remixTone, remixInstruction } =
      input;

    const creditResult = await this.deductCredit(userId);
    if (!creditResult.success) {
      return creditResult;
    }

    let finalScripts: Script[];
    let generationId: string;

    try {
      const hook = await withDbQuery("fetch_hook", () =>
        this.db.query.hooks.findFirst({
          where: eq(hooks.id, hookId),
        }),
      );

      if (!hook || !hook.isActive) {
        await this.refundCredit(userId);
        return {
          success: false,
          error: "HOOK_NOT_FOUND",
          message: `Hook ${hookId} not found or inactive`,
        };
      }

      const aiResult = await this.callAI(
        hook.text,
        productDescription,
        remixInstruction,
        remixTone,
      );
      if (!aiResult.success) {
        await this.refundCredit(userId);
        return aiResult;
      }

      finalScripts = aiResult.scripts;
      generationId = nanoid();

      const scriptData = {
        id: generationId,
        userId,
        hookId,
        productDescription,
        remixTone: remixTone || null,
        remixInstruction: remixInstruction || null,
        scripts: finalScripts,
        createdAt: new Date(),
      };

      const validationResult = dbGeneratedScriptSchema.safeParse(scriptData);
      if (!validationResult.success) {
        await this.refundCredit(userId);
        logError(
          "Script data validation failed",
          new Error(validationResult.error.message),
          { userId, hookId },
        );
        return {
          success: false,
          error: "DATABASE_ERROR",
          message: "Invalid script data",
        };
      }

      await withTransaction(this.db, async (tx) => {
        await tx.insert(generatedScripts).values({
          id: generationId,
          userId,
          hookId,
          productDescription,
          remixTone: remixTone || null,
          remixInstruction: remixInstruction || null,
          scripts: JSON.stringify(finalScripts),
        });
      });
    } catch (error) {
      await this.refundCredit(userId);
      logError("Generation failed", error, { userId, hookId });
      return {
        success: false,
        error: "DATABASE_ERROR",
        message: "Failed to complete generation",
      };
    }

    return {
      success: true,
      scripts: finalScripts,
      creditsRemaining: creditResult.creditsRemaining,
      generationId,
    };
  }

  private async deductCredit(
    userId: string,
  ): Promise<
    | { success: true; creditsRemaining: number }
    | { success: false; error: "INSUFFICIENT_CREDITS"; message: string }
  > {
    const result = await this.db
      .update(users)
      .set({ credits: sql`credits - 1`, updatedAt: new Date() })
      .where(sql`${users.id} = ${userId} AND ${users.credits} >= 1`)
      .returning({ credits: users.credits });

    if (result.length === 0) {
      return {
        success: false,
        error: "INSUFFICIENT_CREDITS",
        message: "No credits remaining",
      };
    }

    return {
      success: true,
      creditsRemaining: result[0].credits,
    };
  }

  private async refundCredit(userId: string) {
    await this.db
      .update(users)
      .set({ credits: sql`credits + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  private async callAI(
    hook: string,
    productDescription: string,
    remixInstruction?: string,
    remixTone?: string,
  ): Promise<
    | { success: true; scripts: Script[] }
    | { success: false; error: GenerationErrorCode; message: string }
  > {
    return callAiForScripts(
      this.ai,
      hook,
      productDescription,
      remixInstruction,
      remixTone,
    );
  }
}

export async function generateScripts(
  ai: Ai,
  d1: D1Database,
  input: GenerationInput,
): Promise<GenerationResult> {
  const db = createDb(d1);
  const service = new GenerationService(ai, db);
  return service.generate(input);
}

export async function generateGuestScripts(
  ai: Ai,
  d1: D1Database,
  input: Omit<GenerationInput, "userId">,
): Promise<GenerationResult> {
  const db = createDb(d1);
  const { hookId, productDescription, remixInstruction, remixTone } = input;

  try {
    const hook = await withDbQuery("fetch_hook", () =>
      db.query.hooks.findFirst({
        where: eq(hooks.id, hookId),
      }),
    );

    if (!hook || !hook.isActive) {
      return {
        success: false,
        error: "HOOK_NOT_FOUND",
        message: `Hook ${hookId} not found or inactive`,
      };
    }

    const aiResult = await callAiForScripts(
      ai,
      hook.text,
      productDescription,
      remixInstruction,
      remixTone,
    );
    if (!aiResult.success) {
      return aiResult;
    }

    return {
      success: true,
      scripts: aiResult.scripts,
      creditsRemaining: 0,
      generationId: nanoid(),
    };
  } catch (error) {
    logError("Guest generation failed", error, { hookId });
    return {
      success: false,
      error: "DATABASE_ERROR",
      message: "Failed to complete generation",
    };
  }
}
