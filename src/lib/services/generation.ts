import { AI_CONFIG, SYSTEM_PROMPT, buildUserPrompt } from "../prompts";
import { createDb, type Database } from "../db";
import { users, generatedScripts, hooks } from "../schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

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

export interface GenerationInput {
  userId: string;
  hookId: string;
  productDescription: string;
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
    const { userId, hookId, productDescription } = input;

    const creditResult = await this.deductCredit(userId);
    if (!creditResult.success) {
      return creditResult;
    }

    let finalScripts: Script[];
    let generationId: string;

    try {
      const hook = await this.db.query.hooks.findFirst({
        where: eq(hooks.id, hookId),
      });

      if (!hook || !hook.isActive) {
        await this.refundCredit(userId);
        return {
          success: false,
          error: "HOOK_NOT_FOUND",
          message: `Hook ${hookId} not found or inactive`,
        };
      }

      const aiResult = await this.callAI(hook.text, productDescription);
      if (!aiResult.success) {
        await this.refundCredit(userId);
        return aiResult;
      }

      finalScripts = aiResult.scripts;
      generationId = nanoid();

      await this.db.transaction(async (tx) => {
        await tx.insert(generatedScripts).values({
          id: generationId,
          userId,
          hookId,
          productDescription,
          scripts: JSON.stringify(finalScripts),
        });
      });
    } catch (error) {
      await this.refundCredit(userId);
      console.error("Generation failed:", error);
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
  ): Promise<
    | { success: true; scripts: Script[] }
    | { success: false; error: GenerationErrorCode; message: string }
  > {
    try {
      const response = await this.ai.run(AI_CONFIG.model, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(hook, productDescription) },
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.max_tokens,
      });

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
      console.error("AI error:", error);
      return {
        success: false,
        error: "AI_UNAVAILABLE",
        message: "AI service unavailable",
      };
    }
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
