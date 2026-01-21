import { z } from "zod";

const id = z.string().min(1).max(100);
const email = z.string().email();
const hookText = z.string().min(8).max(200);
const engagementScore = z.number().int().min(0).max(100);
const turnstileTokenSchema = z
  .string()
  .min(1, "Verification is required to continue");

export const hookCategorySchema = z.enum([
  "beauty",
  "tech",
  "finance",
  "pets",
  "fitness",
  "food",
]);

// ============================================================================
// DATABASE MODEL SCHEMAS - Validates data before DB insertion
// ============================================================================

export const userRoleSchema = z.enum(["user", "pro", "admin"]);
export const userCreditsSchema = z.number().int().min(0);

export const dbUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(255).optional().nullable(),
  email: z.string().email(),
  emailVerified: z.number().optional().nullable(),
  image: z.string().url().optional().nullable(),
  role: userRoleSchema,
  credits: userCreditsSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const hookStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const ratingValueSchema = z.number().int().min(1).max(5);

const remixToneSchema = z.enum([
  "default",
  "funny",
  "professional",
  "luxury",
  "urgent",
  "playful",
  "direct",
]);

export const dbHookSchema = z.object({
  id: z.string().min(1),
  text: hookText,
  category: hookCategorySchema,
  engagementScore: engagementScore,
  source: z.string().max(120).optional().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const dbHookReviewQueueSchema = z.object({
  id: z.string().min(1),
  text: hookText,
  category: hookCategorySchema,
  engagementScore: engagementScore,
  source: z.string().max(120).optional().nullable(),
  status: hookStatusSchema,
  reviewerId: z.string().optional().nullable(),
  reviewedAt: z.date().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const dbGeneratedScriptSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  hookId: z.string().min(1),
  productDescription: z.string().min(20).max(500),
  remixTone: remixToneSchema.optional().nullable(),
  remixInstruction: z.string().max(200).optional().nullable(),
  scripts: z
    .array(
      z.object({
        angle: z.enum(["Pain Point", "Benefit", "Social Proof"]),
        script: z.string().min(10).max(2000),
      }),
    )
    .min(3)
    .max(3),
  createdAt: z.date(),
});

export const dbScriptRatingSchema = z.object({
  id: z.string().min(1),
  generatedScriptId: z.string().min(1),
  userId: z.string().optional().nullable(),
  scriptIndex: z.number().int().min(0).max(2),
  rating: ratingValueSchema,
  isHelpful: z.boolean(),
  feedback: z.string().max(1000).optional().nullable(),
  createdAt: z.date(),
});

export const dbScriptFavoriteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  generatedScriptId: z.string().min(1),
  createdAt: z.date(),
});

export const dbCompetitorAnalysisSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  tiktokUrl: z.string().url().max(500),
  title: z.string().max(255).optional().nullable(),
  author: z.string().max(255).optional().nullable(),
  transcript: z.string().min(1),
  transcriptSource: z.string().min(1),
  hook: z.string().min(3).optional().nullable(),
  structure: z
    .array(
      z.object({
        label: z.string().min(2),
        summary: z.string().min(3),
      }),
    )
    .optional()
    .nullable(),
  template: z
    .array(
      z.object({
        label: z.string().min(2),
        script: z.string().min(3),
      }),
    )
    .optional()
    .nullable(),
  cta: z.string().optional().nullable(),
  notes: z.array(z.string()).optional().nullable(),
  createdAt: z.date(),
});

export const dbRateLimitSchema = z.object({
  ip: z.string().ip(),
  endpoint: z.string().min(1),
  count: z.number().int().min(0),
  resetAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

export const REMIX_TONES = remixToneSchema.options;
export type RemixTone = (typeof REMIX_TONES)[number];

export const HOOK_CATEGORIES = [
  "beauty",
  "tech",
  "finance",
  "pets",
  "fitness",
  "food",
] as const;

export const generateRequestSchema = z.object({
  hookId: id,
  productDescription: z
    .string()
    .min(20, "Product description must be at least 20 characters")
    .max(1000, "Product description must not exceed 1000 characters")
    .transform((val) => val.trim().slice(0, 500))
    .refine(
      (val) => val.length <= 500,
      "Product description truncated to 500 characters",
    ),
  remixTone: remixToneSchema.optional(),
  remixInstruction: z
    .string()
    .max(200, "Remix instruction must not exceed 200 characters")
    .optional()
    .transform((val) => (val ? val.trim().slice(0, 200) : val)),
  turnstileToken: turnstileTokenSchema,
});

export const waitlistRequestSchema = z.object({
  email,
  featureInterest: z.enum(["unlimited", "team", "api", "spy"]).optional(),
  sourceUrl: z.string().url().optional(),
  userTier: z.string().max(50).optional(),
});

export const hooksQuerySchema = z.object({
  category: hookCategorySchema.optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const adminHooksQuerySchema = z.object({
  status: z.enum(["active", "inactive", "all"]).default("all"),
  category: hookCategorySchema.optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const hookReviewStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const reviewQueueQuerySchema = z.object({
  status: hookReviewStatusSchema.optional(),
  category: hookCategorySchema.optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const adminHookCreateSchema = z.object({
  text: hookText,
  category: hookCategorySchema,
  engagementScore,
  source: z.string().max(120).optional(),
  isActive: z.boolean().optional(),
});

export const adminHookUpdateSchema = z.object({
  text: hookText.optional(),
  category: hookCategorySchema.optional(),
  engagementScore: engagementScore.optional(),
  source: z.string().max(120).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const reviewQueueCreateSchema = z.object({
  text: hookText,
  category: hookCategorySchema,
  engagementScore,
  source: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const reviewQueueBulkSchema = z.union([
  reviewQueueCreateSchema,
  z.array(reviewQueueCreateSchema).min(1),
]);

export const reviewQueueUpdateSchema = z.object({
  text: hookText.optional(),
  category: hookCategorySchema.optional(),
  engagementScore: engagementScore.optional(),
  source: z.string().max(120).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: hookReviewStatusSchema.optional(),
  publish: z.boolean().optional(),
});

export const fakeDoorClickSchema = z.object({
  feature: z.enum(["analyze_url"]),
});

export const ratingRequestSchema = z.object({
  scriptIndex: z.number().int().min(0).max(2),
  rating: z.number().int().min(1).max(5),
  isHelpful: z.boolean().optional(),
  feedback: z.string().max(1000).optional(),
});

export const favoriteRequestSchema = z.object({
  generatedScriptId: id,
});

export const regenerateRequestSchema = z.object({
  angle: z.enum(["Pain Point", "Benefit", "Social Proof"]),
});

export const analyzeRequestSchema = z.object({
  url: z
    .string()
    .url()
    .max(500)
    .refine((value) => {
      try {
        const host = new URL(value).hostname.replace(/^www\./, "");
        return host.endsWith("tiktok.com");
      } catch {
        return false;
      }
    }, "Must be a valid TikTok URL"),
  turnstileToken: turnstileTokenSchema,
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
export type HooksQuery = z.infer<typeof hooksQuerySchema>;
export type HookCategory = z.infer<typeof hookCategorySchema>;
export type RatingRequest = z.infer<typeof ratingRequestSchema>;
export type FavoriteRequest = z.infer<typeof favoriteRequestSchema>;
export type RegenerateRequest = z.infer<typeof regenerateRequestSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export const analyzeProductRequestSchema = z.object({
  url: z
    .string()
    .url()
    .max(500, "URL is too long")
    .refine((value) => {
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "Must be a valid HTTP/HTTPS URL"),
});

export type AnalyzeProductRequest = z.infer<typeof analyzeProductRequestSchema>;

export type AdminHooksQuery = z.infer<typeof adminHooksQuerySchema>;
export type HookReviewStatus = z.infer<typeof hookReviewStatusSchema>;
export type ReviewQueueQuery = z.infer<typeof reviewQueueQuerySchema>;
export type AdminHookCreateRequest = z.infer<typeof adminHookCreateSchema>;
export type AdminHookUpdateRequest = z.infer<typeof adminHookUpdateSchema>;
export type ReviewQueueCreateRequest = z.infer<typeof reviewQueueCreateSchema>;
export type ReviewQueueUpdateRequest = z.infer<typeof reviewQueueUpdateSchema>;

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
