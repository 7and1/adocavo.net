import { z } from "zod";

const id = z.string().min(1).max(100);
const email = z.string().email();

export const hookCategorySchema = z.enum([
  "beauty",
  "tech",
  "finance",
  "pets",
  "fitness",
  "food",
]);

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

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
export type HooksQuery = z.infer<typeof hooksQuerySchema>;
export type HookCategory = z.infer<typeof hookCategorySchema>;
export type RatingRequest = z.infer<typeof ratingRequestSchema>;
export type FavoriteRequest = z.infer<typeof favoriteRequestSchema>;
export type RegenerateRequest = z.infer<typeof regenerateRequestSchema>;

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
