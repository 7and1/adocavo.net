import { withErrorHandler, successResponse } from "@/lib/api-utils";
import { AppError, ValidationError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { getCache, CacheTTL } from "@/lib/cache";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { scrapeProductUrl, formatProductDescription } from "@/lib/url-scraper";
import { getBindings } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

// Request validation schema
const analyzeProductRequestSchema = {
  url: (value: string) => {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid URL protocol");
      }
      return true;
    } catch {
      return false;
    }
  },
};

function validateUrl(url: unknown): { valid: boolean; error?: string } {
  if (typeof url !== "string") {
    return { valid: false, error: "URL must be a string" };
  }
  if (url.length > 500) {
    return { valid: false, error: "URL is too long" };
  }
  if (!analyzeProductRequestSchema.url(url)) {
    return { valid: false, error: "Invalid URL format" };
  }

  // Additional check for private IPs
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const blocked = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "10.",
      "192.168.",
      "172.16.",
      "172.17.",
      "172.18.",
      "172.19.",
      "172.20.",
      "172.21.",
      "172.22.",
      "172.23.",
      "172.24.",
      "172.25.",
      "172.26.",
      "172.27.",
      "172.28.",
      "172.29.",
      "172.30.",
      "172.31.",
    ];
    if (blocked.some((b) => hostname === b || hostname.startsWith(b))) {
      return { valid: false, error: "Private IP addresses are not allowed" };
    }
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  return { valid: true };
}

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();

  const body = await request.json().catch(() => {
    throw new ValidationError("Invalid request body");
  });

  const { url } = body;

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new ValidationError(validation.error);
  }

  const env = getBindings();

  if (!env.DB) {
    throw new AppError("ENV_MISSING", "Database binding missing", 500);
  }

  const db = createDb(env.DB as D1Database);

  // Check rate limit
  const { identifier, tier } = await getRateLimitContext(request, session);
  const rate = await checkRateLimit(db, identifier, "analyzeProduct", tier);

  if (!rate.allowed) {
    throw new AppError(
      "RATE_LIMIT_EXCEEDED",
      "Too many product analysis requests. Please try again later.",
      429,
      { retryAfter: rate.retryAfter },
    );
  }

  // Generate cache key
  const cacheKey = `product:scrape:${url}`;
  const cache = getCache();

  // Try to get from cache first
  if (cache) {
    const cached = await cache.get<{
      title: string;
      description: string;
      price?: string;
      imageUrl?: string;
      source: string;
      formatted: string;
      aiAnalysis?: string;
    }>(cacheKey);

    if (cached) {
      return successResponse(cached);
    }
  }

  // Scrape the product URL
  let productInfo;
  try {
    productInfo = await scrapeProductUrl(url, { timeout: 10000 });
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError("SCRAPE_ERROR", error.message, 400);
    }
    throw new AppError(
      "SCRAPE_ERROR",
      "Failed to extract product information",
      500,
    );
  }

  // Use AI to analyze selling points if available
  let aiAnalysis: string | undefined;
  if (env.AI) {
    try {
      const prompt = `Analyze this product information and extract the key selling points that would be most compelling for TikTok advertising:

Product: ${productInfo.title}
Description: ${productInfo.description}
${productInfo.price ? `Price: ${productInfo.price}` : ""}

Please identify:
1. Main problem it solves
2. Unique features
3. Target audience
4. Key benefits
5. Emotional hooks

Respond in 2-3 concise sentences highlighting the most compelling selling points.`;

      const response = await (env.AI as Ai).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [
            {
              role: "system",
              content:
                "You are an expert marketing copywriter specializing in TikTok advertising. Extract compelling selling points from product information.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 300,
        },
      );

      if (response?.response) {
        aiAnalysis = response.response.trim();
      }
    } catch (error) {
      // AI analysis is optional, don't fail if it errors
      console.warn("AI analysis failed:", error);
    }
  }

  const result = {
    title: productInfo.title,
    description: productInfo.description,
    price: productInfo.price,
    imageUrl: productInfo.imageUrl,
    source: productInfo.source,
    formatted: formatProductDescription(productInfo),
    aiAnalysis,
  };

  // Cache the result for 24 hours
  if (cache) {
    await cache.set(cacheKey, result, { ttl: CacheTTL.VERY_LONG });
  }

  return successResponse(result);
});
