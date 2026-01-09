# Technical Architecture - Adocavo Intelligence

## Document Purpose

This document provides detailed technical specifications for the system architecture, service layer patterns, type safety implementation, error handling strategies, and testing approaches.

**Version**: 1.0.0
**Last Updated**: 2026-01-09
**Reference**: [BLUEPRINT.md](./BLUEPRINT.md)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   Client (RSC)   |---->|  Cloudflare Edge  |---->|  Workers AI      |
|   Next.js 15     |     |  Pages + Workers  |     |  Llama 3.1 70B   |
|                  |     |                   |     |                  |
+------------------+     +--------+----------+     +------------------+
                                  |
                                  v
                         +--------+----------+
                         |                   |
                         |   Cloudflare D1   |
                         |   (SQLite Edge)   |
                         |                   |
                         +-------------------+
```

### 1.2 Request Flow

```
1. User Request
   |
   v
2. Cloudflare CDN (Edge Cached Static Assets)
   |
   v
3. Next.js Middleware (Auth Check, Rate Limiting)
   |
   v
4. Server Component / API Route
   |
   +---> Cache Layer (Workers Cache API)
   |          |
   |          v
   +---> D1 Database (Drizzle ORM)
   |
   +---> Workers AI (Script Generation)
   |
   v
5. Response (JSON / RSC Payload)
```

### 1.3 Module Dependency Graph

```
src/
├── app/                    # Next.js App Router (Presentation Layer)
│   ├── api/               # API Routes (HTTP Interface)
│   └── [pages]/           # React Server Components
│
├── lib/                   # Shared Libraries
│   ├── auth.ts            # Auth.js Configuration
│   ├── db.ts              # Drizzle Client Factory
│   ├── schema.ts          # Drizzle Schema Definitions
│   ├── prompts.ts         # AI Prompt Templates
│   ├── errors.ts          # Error Classes
│   ├── api-utils.ts       # API Response Helpers
│   ├── validations.ts     # Zod Schemas
│   └── services/          # Business Logic Layer
│       ├── generation.ts  # Script Generation Service
│       ├── hooks.ts       # Hook Management Service
│       ├── credits.ts     # Credit Management Service
│       └── analytics.ts   # Analytics Service
│
├── components/            # React Components (UI Layer)
│   ├── ui/               # Primitive UI Components (shadcn)
│   └── [feature]/        # Feature Components
│
└── types/                # TypeScript Type Definitions
    ├── next-auth.d.ts    # Auth Session Extension
    ├── cloudflare.d.ts   # Cloudflare Bindings
    └── api.ts            # API Request/Response Types
```

---

## 2. Service Layer Architecture

### 2.1 Service Design Principles

1. **Single Responsibility**: Each service handles one domain
2. **Dependency Injection**: Services receive DB/AI as parameters
3. **Pure Functions**: No side effects except explicit I/O
4. **Result Types**: Return `{ success, data?, error? }` objects
5. **Transaction Boundaries**: Explicit transaction scopes

### 2.2 Generation Service

```typescript
// src/lib/services/generation.ts
import { AI_CONFIG, SYSTEM_PROMPT, buildUserPrompt } from "../prompts";
import { createDb, type Database } from "../db";
import { users, generatedScripts, hooks } from "../schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// Type definitions
export interface Script {
  angle: "Pain Point" | "Benefit" | "Social Proof";
  script: string;
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

// Service implementation
export class GenerationService {
  constructor(
    private readonly ai: Ai,
    private readonly db: Database,
  ) {}

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const { userId, hookId, productDescription } = input;

    // Step 1: Deduct credit with optimistic locking
    const creditResult = await this.deductCredit(userId);
    if (!creditResult.success) {
      return creditResult;
    }

    // Step 2: Fetch hook
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

    // Step 3: Generate scripts
    const aiResult = await this.callAI(hook.text, productDescription);
    if (!aiResult.success) {
      await this.refundCredit(userId);
      return aiResult;
    }

    // Step 4: Save to database
    const generationId = nanoid();
    await this.db.insert(generatedScripts).values({
      id: generationId,
      userId,
      hookId,
      productDescription,
      scripts: JSON.stringify(aiResult.scripts),
    });

    return {
      success: true,
      scripts: aiResult.scripts,
      creditsRemaining: creditResult.creditsRemaining,
      generationId,
    };
  }

  private async deductCredit(
    userId: string,
  ): Promise<{ success: true; creditsRemaining: number } | GenerationError> {
    try {
      const result = await this.db
        .update(users)
        .set({ credits: sql`credits - 1` })
        .where(sql`${users.id} = ${userId} AND ${users.credits} >= 1`)
        .returning({ credits: users.credits });

      if (result.length === 0) {
        return {
          success: false,
          error: "INSUFFICIENT_CREDITS",
          message: "No credits remaining. Join the waitlist for more.",
        };
      }

      return { success: true, creditsRemaining: result[0].credits };
    } catch (error) {
      return {
        success: false,
        error: "DATABASE_ERROR",
        message: "Failed to deduct credit",
      };
    }
  }

  private async refundCredit(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ credits: sql`credits + 1` })
      .where(eq(users.id, userId));
  }

  private async callAI(
    hookText: string,
    productDescription: string,
  ): Promise<{ success: true; scripts: Script[] } | GenerationError> {
    try {
      const response = await this.ai.run(AI_CONFIG.model, {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(hookText, productDescription),
          },
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.max_tokens,
      });

      const content = (response as { response?: string }).response || "";
      return this.parseAIResponse(content);
    } catch (error) {
      console.error("AI call failed:", error);
      return {
        success: false,
        error: "AI_UNAVAILABLE",
        message: "Script generation service temporarily unavailable",
      };
    }
  }

  private parseAIResponse(
    content: string,
  ): { success: true; scripts: Script[] } | GenerationError {
    try {
      // Extract JSON from response (may have markdown wrapper)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed.scripts) || parsed.scripts.length !== 3) {
        throw new Error("Invalid scripts array");
      }

      // Validate each script
      const validAngles = ["Pain Point", "Benefit", "Social Proof"];
      for (const script of parsed.scripts) {
        if (!validAngles.includes(script.angle)) {
          throw new Error(`Invalid angle: ${script.angle}`);
        }
        if (typeof script.script !== "string" || script.script.length < 50) {
          throw new Error("Invalid script content");
        }
      }

      return { success: true, scripts: parsed.scripts };
    } catch (error) {
      console.error("Failed to parse AI response:", error, content);
      return {
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: "Failed to generate valid scripts. Please try again.",
      };
    }
  }
}

// Factory function for dependency injection
export function createGenerationService(ai: Ai, d1: D1Database) {
  return new GenerationService(ai, createDb(d1));
}
```

### 2.3 Hooks Service

```typescript
// src/lib/services/hooks.ts
import { createDb, type Database } from "../db";
import { hooks } from "../schema";
import { eq, and, desc, like, sql } from "drizzle-orm";

export interface Hook {
  id: string;
  text: string;
  category: HookCategory;
  engagementScore: number;
  source: string | null;
}

export type HookCategory =
  | "beauty"
  | "tech"
  | "finance"
  | "pets"
  | "fitness"
  | "food";

export interface HookFilters {
  category?: HookCategory;
  search?: string;
  minEngagement?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

const CACHE_KEY_PREFIX = "hooks:";
const CACHE_TTL = 60 * 60 * 24; // 24 hours

export class HooksService {
  constructor(private readonly db: Database) {}

  async getHooks(
    filters: HookFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
  ): Promise<PaginatedResult<Hook>> {
    const { category, search, minEngagement = 0 } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [
      eq(hooks.isActive, true),
      sql`${hooks.engagementScore} >= ${minEngagement}`,
    ];

    if (category) {
      conditions.push(eq(hooks.category, category));
    }

    if (search) {
      conditions.push(like(hooks.text, `%${search}%`));
    }

    // Execute queries
    const [data, countResult] = await Promise.all([
      this.db
        .select({
          id: hooks.id,
          text: hooks.text,
          category: hooks.category,
          engagementScore: hooks.engagementScore,
          source: hooks.source,
        })
        .from(hooks)
        .where(and(...conditions))
        .orderBy(desc(hooks.engagementScore))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: sql<number>`count(*)` })
        .from(hooks)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      data: data as Hook[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + data.length < total,
    };
  }

  async getHookById(id: string): Promise<Hook | null> {
    const result = await this.db.query.hooks.findFirst({
      where: and(eq(hooks.id, id), eq(hooks.isActive, true)),
    });

    return result as Hook | null;
  }

  async getCategories(): Promise<{ category: HookCategory; count: number }[]> {
    const result = await this.db
      .select({
        category: hooks.category,
        count: sql<number>`count(*)`,
      })
      .from(hooks)
      .where(eq(hooks.isActive, true))
      .groupBy(hooks.category)
      .orderBy(desc(sql`count(*)`));

    return result as { category: HookCategory; count: number }[];
  }

  // Cached version for public API
  async getHooksCached(
    d1: D1Database,
    filters: HookFilters = {},
  ): Promise<Hook[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}${JSON.stringify(filters)}`;
    const cache = caches.default;

    // Try cache first
    const cached = await cache.match(new Request(`https://cache/${cacheKey}`));
    if (cached) {
      return cached.json();
    }

    // Fetch from database
    const result = await this.getHooks(filters, { page: 1, limit: 100 });

    // Store in cache
    const response = new Response(JSON.stringify(result.data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `max-age=${CACHE_TTL}`,
      },
    });
    await cache.put(new Request(`https://cache/${cacheKey}`), response.clone());

    return result.data;
  }
}

export function createHooksService(d1: D1Database) {
  return new HooksService(createDb(d1));
}
```

### 2.4 Credits Service

```typescript
// src/lib/services/credits.ts
import { createDb, type Database } from "../db";
import { users } from "../schema";
import { eq, sql } from "drizzle-orm";

export interface CreditBalance {
  userId: string;
  credits: number;
  canGenerate: boolean;
}

export interface CreditTransaction {
  type: "deduct" | "refund" | "bonus";
  amount: number;
  reason: string;
  timestamp: Date;
}

export class CreditsService {
  constructor(private readonly db: Database) {}

  async getBalance(userId: string): Promise<CreditBalance | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, credits: true },
    });

    if (!user) return null;

    return {
      userId: user.id,
      credits: user.credits,
      canGenerate: user.credits >= 1,
    };
  }

  async deduct(
    userId: string,
    amount: number = 1,
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    const result = await this.db
      .update(users)
      .set({ credits: sql`credits - ${amount}` })
      .where(sql`${users.id} = ${userId} AND ${users.credits} >= ${amount}`)
      .returning({ credits: users.credits });

    if (result.length === 0) {
      return { success: false, error: "INSUFFICIENT_CREDITS" };
    }

    return { success: true, newBalance: result[0].credits };
  }

  async refund(userId: string, amount: number = 1): Promise<void> {
    await this.db
      .update(users)
      .set({ credits: sql`credits + ${amount}` })
      .where(eq(users.id, userId));
  }

  async addBonus(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ credits: sql`credits + ${amount}` })
      .where(eq(users.id, userId));

    // Could log to a credit_transactions table for audit
    console.log(`Bonus credits: ${userId} +${amount} (${reason})`);
  }
}

export function createCreditsService(d1: D1Database) {
  return new CreditsService(createDb(d1));
}
```

---

## 3. Type Safety with Drizzle

### 3.1 Schema Type Inference

```typescript
// src/lib/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  credits: integer("credits").default(10).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

// Type inference from schema
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Partial types for updates
export type UserUpdate = Partial<Omit<User, "id" | "createdAt">>;
```

### 3.2 Type-Safe Queries

```typescript
// Example of fully type-safe queries
import { db } from "@/lib/db";
import { users, hooks, generatedScripts } from "@/lib/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";

// Simple select with type inference
const user = await db.query.users.findFirst({
  where: eq(users.id, "user_123"),
});
// Type: User | undefined

// Select with specific columns
const userCredits = await db
  .select({ id: users.id, credits: users.credits })
  .from(users)
  .where(eq(users.id, "user_123"));
// Type: { id: string; credits: number }[]

// Join with relations
const scriptsWithHooks = await db.query.generatedScripts.findMany({
  where: eq(generatedScripts.userId, "user_123"),
  with: {
    hook: true, // Include related hook
  },
  orderBy: [desc(generatedScripts.createdAt)],
  limit: 10,
});
// Type: (GeneratedScript & { hook: Hook })[]

// Aggregation with raw SQL
const stats = await db
  .select({
    totalGenerations: sql<number>`count(*)`,
    avgCredits: sql<number>`avg(credits)`,
  })
  .from(users);
// Type: { totalGenerations: number; avgCredits: number }[]
```

### 3.3 Transaction Handling

```typescript
// src/lib/db.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

// Transaction helper
export async function withTransaction<T>(
  db: Database,
  callback: (tx: Database) => Promise<T>,
): Promise<T> {
  // D1 doesn't support traditional transactions
  // Use batch operations for atomic writes
  return callback(db);
}

// Batch operation example
export async function batchInsert(
  db: Database,
  records: Array<typeof schema.hooks.$inferInsert>,
): Promise<void> {
  // Drizzle batches these into a single request
  await db.insert(schema.hooks).values(records);
}
```

---

## 4. Error Handling Patterns

### 4.1 Error Type Hierarchy

```typescript
// src/lib/errors.ts

// Base error class with serialization
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}

// Client errors (4xx)
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly details: Record<string, string[]>,
  ) {
    super(message);
  }
}

export class AuthenticationError extends AppError {
  readonly code = "AUTHENTICATION_ERROR";
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class AuthorizationError extends AppError {
  readonly code = "AUTHORIZATION_ERROR";
  readonly statusCode = 403;
  readonly isOperational = true;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}

export class InsufficientCreditsError extends AppError {
  readonly code = "INSUFFICIENT_CREDITS";
  readonly statusCode = 402;
  readonly isOperational = true;

  constructor() {
    super("No credits remaining. Join the waitlist for more.");
  }
}

export class RateLimitError extends AppError {
  readonly code = "RATE_LIMIT_EXCEEDED";
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(public readonly retryAfter: number) {
    super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
  }
}

// Server errors (5xx)
export class DatabaseError extends AppError {
  readonly code = "DATABASE_ERROR";
  readonly statusCode = 500;
  readonly isOperational = false;
}

export class AIServiceError extends AppError {
  readonly code = "AI_SERVICE_ERROR";
  readonly statusCode = 503;
  readonly isOperational = true;

  constructor(message: string = "AI service temporarily unavailable") {
    super(message);
  }
}

// Error type guard
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

### 4.2 API Error Handler

```typescript
// src/lib/api-utils.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError, ValidationError } from "./errors";

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function successResponse<T>(
  data: T,
  status = 200,
): NextResponse<APIResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  error: unknown,
): NextResponse<APIResponse<never>> {
  // Handle known application errors
  if (isAppError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: error.toJSON(),
      },
      { status: error.statusCode },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.flatten();
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details,
        },
      },
      { status: 400 },
    );
  }

  // Log unexpected errors
  console.error("Unexpected error:", error);

  // Return generic error for unknown errors
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 },
  );
}

// Route handler wrapper
export function withErrorHandler<T>(
  handler: (request: Request) => Promise<NextResponse<APIResponse<T>>>,
) {
  return async (request: Request): Promise<NextResponse<APIResponse<T>>> => {
    try {
      return await handler(request);
    } catch (error) {
      return errorResponse(error) as NextResponse<APIResponse<T>>;
    }
  };
}
```

### 4.3 Client-Side Error Handling

```typescript
// src/lib/client-api.ts

export class APIClient {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new ClientAPIError(
        data.error.code,
        data.error.message,
        response.status,
        data.error.details,
      );
    }

    return data.data;
  }

  async generate(hookId: string, productDescription: string) {
    return this.fetch<{
      scripts: Array<{ angle: string; script: string }>;
      creditsRemaining: number;
    }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({ hookId, productDescription }),
    });
  }
}

export class ClientAPIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ClientAPIError";
  }

  get isCreditsError() {
    return this.code === "INSUFFICIENT_CREDITS";
  }

  get isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isRateLimit() {
    return this.code === "RATE_LIMIT_EXCEEDED";
  }
}

export const api = new APIClient();
```

---

## 5. Validation Schemas

### 5.1 Zod Schemas

```typescript
// src/lib/validations.ts
import { z } from "zod";

// Reusable primitives
const id = z.string().min(1).max(100);
const email = z.string().email();
const nonEmptyString = z.string().min(1);

// Hook category enum
export const hookCategorySchema = z.enum([
  "beauty",
  "tech",
  "finance",
  "pets",
  "fitness",
  "food",
]);

// API Request Schemas
export const generateRequestSchema = z.object({
  hookId: id,
  productDescription: z
    .string()
    .min(20, "Product description must be at least 20 characters")
    .max(500, "Product description must not exceed 500 characters")
    .transform((val) => val.trim()),
});

export const waitlistRequestSchema = z.object({
  email: email,
  featureInterest: z.enum(["unlimited", "team", "api", "spy"]).optional(),
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

// Type exports
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;
export type HooksQuery = z.infer<typeof hooksQuerySchema>;
export type HookCategory = z.infer<typeof hookCategorySchema>;

// Validation helper
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
```

### 5.2 Form Validation Hook

```typescript
// src/hooks/useFormValidation.ts
"use client";

import { useState, useCallback } from "react";
import { z, ZodSchema } from "zod";

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

export function useFormValidation<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  initialValues: T,
) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: false,
    isSubmitting: false,
  });

  const validateField = useCallback(
    (field: keyof T, value: unknown) => {
      try {
        schema.parse({ ...state.values, [field]: value });
        return undefined;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((e) => e.path[0] === field);
          return fieldError?.message;
        }
        return "Invalid value";
      }
    },
    [schema, state.values],
  );

  const setFieldValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setState((prev) => {
        const newValues = { ...prev.values, [field]: value };
        const error = validateField(field, value);
        const newErrors = { ...prev.errors, [field]: error };

        // Check overall validity
        const result = schema.safeParse(newValues);

        return {
          ...prev,
          values: newValues,
          errors: newErrors,
          isValid: result.success,
        };
      });
    },
    [schema, validateField],
  );

  const setFieldTouched = useCallback((field: keyof T) => {
    setState((prev) => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void>) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));

      const result = schema.safeParse(state.values);

      if (!result.success) {
        const errors: Partial<Record<keyof T, string>> = {};
        for (const error of result.error.errors) {
          const field = error.path[0] as keyof T;
          if (!errors[field]) {
            errors[field] = error.message;
          }
        }
        setState((prev) => ({
          ...prev,
          errors,
          isSubmitting: false,
        }));
        return;
      }

      try {
        await onSubmit(result.data);
      } finally {
        setState((prev) => ({ ...prev, isSubmitting: false }));
      }
    },
    [schema, state.values],
  );

  return {
    ...state,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  };
}
```

---

## 6. Testing Strategy

### 6.1 Test Structure

```
tests/
├── unit/                    # Unit tests (fast, isolated)
│   ├── services/
│   │   ├── generation.test.ts
│   │   ├── hooks.test.ts
│   │   └── credits.test.ts
│   ├── lib/
│   │   ├── prompts.test.ts
│   │   └── validations.test.ts
│   └── utils/
│       └── format.test.ts
│
├── integration/             # Integration tests (DB, API)
│   ├── api/
│   │   ├── generate.test.ts
│   │   ├── hooks.test.ts
│   │   └── auth.test.ts
│   └── db/
│       └── migrations.test.ts
│
├── e2e/                     # End-to-end tests (Playwright)
│   ├── auth.spec.ts
│   ├── hook-library.spec.ts
│   ├── generation.spec.ts
│   └── credits.spec.ts
│
└── fixtures/                # Test data
    ├── hooks.ts
    ├── users.ts
    └── scripts.ts
```

### 6.2 Unit Test Example

```typescript
// tests/unit/services/generation.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenerationService } from "@/lib/services/generation";

// Mock database
const mockDb = {
  query: {
    hooks: {
      findFirst: vi.fn(),
    },
  },
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(),
  })),
};

// Mock AI
const mockAi = {
  run: vi.fn(),
};

describe("GenerationService", () => {
  let service: GenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GenerationService(mockAi as any, mockDb as any);
  });

  describe("generate", () => {
    it("should return INSUFFICIENT_CREDITS when user has no credits", async () => {
      mockDb.update.mockReturnValue({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([]),
          }),
        }),
      });

      const result = await service.generate({
        userId: "user_1",
        hookId: "hook_1",
        productDescription: "Test product description here",
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error", "INSUFFICIENT_CREDITS");
    });

    it("should return HOOK_NOT_FOUND when hook does not exist", async () => {
      // User has credits
      mockDb.update.mockReturnValue({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([{ credits: 9 }]),
          }),
        }),
      });

      // Hook not found
      mockDb.query.hooks.findFirst.mockResolvedValue(null);

      const result = await service.generate({
        userId: "user_1",
        hookId: "nonexistent",
        productDescription: "Test product description here",
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty("error", "HOOK_NOT_FOUND");
    });

    it("should successfully generate scripts", async () => {
      // User has credits
      mockDb.update.mockReturnValue({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([{ credits: 9 }]),
          }),
        }),
      });

      // Hook exists
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook_1",
        text: "Stop scrolling if you have acne",
        isActive: true,
      });

      // AI returns valid response
      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          scripts: [
            { angle: "Pain Point", script: "Valid script content here..." },
            { angle: "Benefit", script: "Valid script content here..." },
            { angle: "Social Proof", script: "Valid script content here..." },
          ],
        }),
      });

      const result = await service.generate({
        userId: "user_1",
        hookId: "hook_1",
        productDescription: "Test product description here",
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty("scripts");
      expect(result).toHaveProperty("creditsRemaining", 9);
    });
  });
});
```

### 6.3 Integration Test Example

```typescript
// tests/integration/api/generate.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";

describe("POST /api/generate", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev("src/app/api/generate/route.ts", {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it("returns 401 without authentication", async () => {
    const response = await worker.fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hookId: "hook_1",
        productDescription: "Test product",
      }),
    });

    expect(response.status).toBe(401);
  });

  it("returns 400 with invalid input", async () => {
    const response = await worker.fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=valid_session_token",
      },
      body: JSON.stringify({
        hookId: "",
        productDescription: "short",
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
```

### 6.4 E2E Test Example

```typescript
// tests/e2e/generation.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Script Generation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/auth/signin");
    await page.click('[data-testid="google-signin"]');
    // Handle OAuth mock/flow
    await page.waitForURL("/");
  });

  test("user can generate scripts from hook library", async ({ page }) => {
    // Navigate to hook library
    await page.goto("/");

    // Select a hook
    await page.click('[data-testid="hook-card"]:first-child');
    await page.click('[data-testid="remix-button"]');

    // Wait for remix page
    await expect(page).toHaveURL(/\/remix\/.+/);

    // Fill product description
    await page.fill(
      '[data-testid="product-input"]',
      "A revolutionary skincare product that clears acne in 2 weeks using natural ingredients.",
    );

    // Generate scripts
    await page.click('[data-testid="generate-button"]');

    // Wait for results
    await expect(page.locator('[data-testid="script-card"]')).toHaveCount(3, {
      timeout: 20000,
    });

    // Verify scripts are displayed
    const scripts = page.locator('[data-testid="script-content"]');
    await expect(scripts.first()).toContainText("[Visual:");
    await expect(scripts.first()).toContainText("(Audio:");

    // Copy to clipboard works
    await page.click('[data-testid="copy-button"]:first-child');
    await expect(page.locator('[data-testid="copy-success"]')).toBeVisible();
  });

  test("shows waitlist modal when out of credits", async ({ page }) => {
    // Set user to 0 credits via test helper
    await page.evaluate(() => {
      localStorage.setItem("test_credits", "0");
    });

    await page.goto("/remix/hook_1");
    await page.fill(
      '[data-testid="product-input"]',
      "Test product description for testing",
    );
    await page.click('[data-testid="generate-button"]');

    // Waitlist modal should appear
    await expect(page.locator('[data-testid="waitlist-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="waitlist-title"]')).toContainText(
      "Out of Credits",
    );
  });
});
```

### 6.5 Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["node_modules", "tests", "**/*.d.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 7. Performance Optimization

### 7.1 Edge Caching Strategy

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Cache static assets aggressively
  if (request.nextUrl.pathname.startsWith("/_next/static")) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
  }

  // Cache API responses for hooks (public data)
  if (request.nextUrl.pathname === "/api/hooks" && request.method === "GET") {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 7.2 Database Query Optimization

```typescript
// src/lib/services/hooks.ts

// Use prepared statements for repeated queries
const preparedQueries = {
  getActiveHooks: db.query.hooks
    .findMany({
      where: eq(hooks.isActive, true),
    })
    .prepare(),

  getHookById: db.query.hooks
    .findFirst({
      where: eq(hooks.id, sql.placeholder("id")),
    })
    .prepare(),
};

// Use batch operations
export async function batchGetHooks(ids: string[]): Promise<Map<string, Hook>> {
  const results = await db.query.hooks.findMany({
    where: inArray(hooks.id, ids),
  });

  return new Map(results.map((h) => [h.id, h]));
}
```

### 7.3 Connection Pooling (Not Needed for D1)

D1 is serverless SQLite - no connection pooling required. Each request gets its own connection automatically.

---

## 8. Security Considerations

### 8.1 Input Sanitization

```typescript
// All user input validated via Zod schemas
// SQL injection prevented by Drizzle's parameterized queries
// XSS prevented by React's default escaping

// Additional sanitization for markdown content
import DOMPurify from "isomorphic-dompurify";

export function sanitizeMarkdown(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br"],
    ALLOWED_ATTR: [],
  });
}
```

### 8.2 Rate Limiting

```typescript
// src/lib/rate-limit.ts
const RATE_LIMIT = {
  generate: { requests: 10, window: 60 }, // 10 per minute
  waitlist: { requests: 3, window: 300 }, // 3 per 5 minutes
};

export async function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMIT,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `rate:${action}:${userId}`;
  const { requests, window } = RATE_LIMIT[action];

  // Use Cloudflare KV or D1 for persistence
  const cache = caches.default;
  const cached = await cache.match(new Request(`https://rate/${key}`));

  if (cached) {
    const data = (await cached.json()) as { count: number; resetAt: number };

    if (Date.now() > data.resetAt) {
      // Window expired, reset
      await updateRateLimit(cache, key, 1, window);
      return { allowed: true };
    }

    if (data.count >= requests) {
      return {
        allowed: false,
        retryAfter: Math.ceil((data.resetAt - Date.now()) / 1000),
      };
    }

    await updateRateLimit(cache, key, data.count + 1, window, data.resetAt);
    return { allowed: true };
  }

  await updateRateLimit(cache, key, 1, window);
  return { allowed: true };
}

async function updateRateLimit(
  cache: Cache,
  key: string,
  count: number,
  window: number,
  resetAt?: number,
) {
  const response = new Response(
    JSON.stringify({
      count,
      resetAt: resetAt ?? Date.now() + window * 1000,
    }),
    { headers: { "Cache-Control": `max-age=${window}` } },
  );
  await cache.put(new Request(`https://rate/${key}`), response);
}
```

---

## 9. Monitoring & Observability

### 9.1 Structured Logging

```typescript
// src/lib/logger.ts
export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export function createLogger(requestId?: string) {
  return {
    info: (message: string, metadata?: Record<string, unknown>) =>
      log("info", message, requestId, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      log("warn", message, requestId, metadata),
    error: (
      message: string,
      error?: Error,
      metadata?: Record<string, unknown>,
    ) =>
      log("error", message, requestId, {
        ...metadata,
        error: error?.message,
        stack: error?.stack,
      }),
  };
}

function log(
  level: LogEntry["level"],
  message: string,
  requestId?: string,
  metadata?: Record<string, unknown>,
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    metadata,
  };

  // In production, this would go to a logging service
  console[level](JSON.stringify(entry));
}
```

### 9.2 Metrics Collection

```typescript
// src/lib/metrics.ts
export interface Metric {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

export const metrics = {
  increment(name: string, tags: Record<string, string> = {}) {
    this.record({ name, value: 1, tags, timestamp: Date.now() });
  },

  timing(name: string, durationMs: number, tags: Record<string, string> = {}) {
    this.record({ name, value: durationMs, tags, timestamp: Date.now() });
  },

  gauge(name: string, value: number, tags: Record<string, string> = {}) {
    this.record({ name, value, tags, timestamp: Date.now() });
  },

  record(metric: Metric) {
    // In production, batch and send to analytics service
    console.log("METRIC:", JSON.stringify(metric));
  },
};

// Usage in services
export async function generateWithMetrics(/*...*/) {
  const start = Date.now();

  try {
    const result = await generate(/*...*/);
    metrics.increment("generation.success", { hookCategory: "beauty" });
    return result;
  } catch (error) {
    metrics.increment("generation.error", { errorType: error.code });
    throw error;
  } finally {
    metrics.timing("generation.duration", Date.now() - start);
  }
}
```

---

## 10. Related Documentation

| Document                                                     | Purpose                     |
| ------------------------------------------------------------ | --------------------------- |
| [BLUEPRINT.md](./BLUEPRINT.md)                               | Master implementation guide |
| [COMPONENT_SPECIFICATIONS.md](./COMPONENT_SPECIFICATIONS.md) | UI component details        |
| [ROUTING_DEPLOYMENT.md](./ROUTING_DEPLOYMENT.md)             | Deployment configuration    |

---

**Document Owner**: Engineering Team
**Review Cycle**: Weekly during development
