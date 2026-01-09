# Adocavo Intelligence - Master Implementation Blueprint

## Document Purpose

This blueprint consolidates all requirements, architecture decisions, and implementation details for building Adocavo Intelligence MVP. A developer reading this document should understand the complete system within 15 minutes and begin implementation immediately.

**Version**: 1.0.0
**Last Updated**: 2026-01-09
**Status**: Ready for Implementation

---

## 1. Product Overview

### 1.1 What We're Building

Adocavo Intelligence is a TikTok/short-form video ad script generation platform that:

1. Curates a library of 50+ proven viral "hooks" (the critical first 3 seconds)
2. Allows users to "remix" hooks with their product details using AI
3. Generates 3 script variations per request (Pain Point, Benefit, Social Proof angles)
4. Operates on a credit-based freemium model (10 free credits, then waitlist)

### 1.2 Target Users

| Persona                      | Pain Point                           | Value Proposition                       |
| ---------------------------- | ------------------------------------ | --------------------------------------- |
| Solo E-Commerce Seller       | Hiring costs $500-2000/script        | 95% cost reduction, instant delivery    |
| Performance Marketing Agency | Junior copywriters lack TikTok voice | Standardized quality, faster turnaround |
| UGC Content Creator          | Brands provide no creative direction | Quick starting points for pitches       |

### 1.3 Success Metrics (8-Week Target)

- **500** signups
- **100** weekly active generators (3+ scripts/week)
- **70%** activation rate (use 1st credit within 24hrs)
- **25%** waitlist conversion rate
- **<15s** P95 generation latency

---

## 2. Tech Stack (Final Decisions)

### 2.1 Core Stack

| Layer              | Technology                         | Why                                                   |
| ------------------ | ---------------------------------- | ----------------------------------------------------- |
| **Framework**      | Next.js 15 (App Router)            | RSC, Cloudflare Pages adapter, team familiarity       |
| **Hosting**        | Cloudflare Pages                   | Zero-config CDN, edge execution, free tier            |
| **Database**       | Cloudflare D1 + **Drizzle ORM**    | Type-safe queries, migrations, @auth/drizzle-adapter  |
| **Authentication** | Auth.js v5 + @auth/drizzle-adapter | Production-ready D1 integration                       |
| **AI Inference**   | Workers AI (Llama 3.1 70B)         | Free tier 10K req/day, quality sufficient for scripts |
| **Styling**        | Tailwind CSS + shadcn/ui           | Rapid UI development, accessible components           |
| **Validation**     | Zod                                | Runtime type validation, form schemas                 |

### 2.2 Why Drizzle ORM (User Feedback Integration)

The original GENESIS.md proposed hand-written SQL. Based on user feedback, we upgrade to Drizzle ORM:

```typescript
// OLD: Hand-written SQL (error-prone, no type safety)
await db
  .prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)")
  .bind(id, name, email)
  .run();

// NEW: Drizzle ORM (type-safe, auto-completion, migrations)
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
await db.insert(users).values({ id, name, email });
```

**Benefits**:

- Type-safe queries with TypeScript inference
- Built-in migration system (`drizzle-kit`)
- Official `@auth/drizzle-adapter` for Auth.js
- Query builder with full SQL capability when needed
- Zero runtime overhead (compiles to SQL)

### 2.3 Dependencies

```json
{
  "dependencies": {
    "next": "15.1.11",
    "@opennextjs/cloudflare": "1.14.8",
    "next-auth": "5.0.0-beta.25",
    "@auth/drizzle-adapter": "1.7.0",
    "drizzle-orm": "0.38.0",
    "zod": "3.24.0",
    "@radix-ui/react-dialog": "1.1.0",
    "@radix-ui/react-dropdown-menu": "2.1.0",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.0",
    "tailwind-merge": "2.6.0",
    "lucide-react": "0.468.0"
  },
  "devDependencies": {
    "drizzle-kit": "0.30.0",
    "wrangler": "4.58.0",
    "@cloudflare/workers-types": "4.20260109.0",
    "typescript": "5.9.3",
    "tailwindcss": "3.4.16",
    "@types/node": "22.0.0",
    "@types/react": "19.0.0"
  }
}
```

---

## 3. Database Schema (Drizzle)

### 3.1 Schema Definition

```typescript
// src/lib/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Auth.js required tables
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
  credits: integer("credits").default(10).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// Application tables
export const hooks = sqliteTable("hooks", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  category: text("category").notNull(), // 'beauty' | 'tech' | 'finance' | 'pets' | 'fitness' | 'food'
  engagementScore: integer("engagement_score").notNull(), // 0-100
  source: text("source"), // Optional: where hook was sourced from
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const generatedScripts = sqliteTable("generated_scripts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hookId: text("hook_id")
    .notNull()
    .references(() => hooks.id),
  productDescription: text("product_description").notNull(),
  scripts: text("scripts", { mode: "json" }).notNull(), // JSON array of 3 scripts
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

export const waitlist = sqliteTable("waitlist", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  email: text("email").notNull(),
  featureInterest: text("feature_interest"), // 'unlimited' | 'team' | 'api' | 'spy'
  createdAt: integer("created_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
});

// Fake door tracking for spy feature validation
export const fakeDoorClicks = sqliteTable("fake_door_clicks", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  feature: text("feature").notNull(), // 'analyze_url'
  clickedAt: integer("clicked_at", { mode: "timestamp" })
    .defaultNow()
    .notNull(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  generatedScripts: many(generatedScripts),
}));

export const hooksRelations = relations(hooks, ({ many }) => ({
  generatedScripts: many(generatedScripts),
}));

export const generatedScriptsRelations = relations(
  generatedScripts,
  ({ one }) => ({
    user: one(users, {
      fields: [generatedScripts.userId],
      references: [users.id],
    }),
    hook: one(hooks, {
      fields: [generatedScripts.hookId],
      references: [hooks.id],
    }),
  }),
);
```

### 3.2 Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push schema to D1 (development)
npx drizzle-kit push

# Apply migrations to production D1
wrangler d1 migrations apply adocavo-db --remote
```

### 3.3 Database Client Setup

```typescript
// src/lib/db.ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
```

---

## 4. AI Script Generation (Few-Shot Enhancement)

### 4.1 Few-Shot Prompting Strategy (User Feedback Integration)

The original GENESIS.md had basic prompts. Based on user feedback, we implement few-shot prompting with 3-5 real script examples:

```typescript
// src/lib/prompts.ts

// Real viral script examples for few-shot learning
const FEW_SHOT_EXAMPLES = [
  {
    hook: "Stop scrolling if you have acne",
    product: "Salicylic acid cleanser for oily skin",
    scripts: [
      {
        angle: "Pain Point",
        script: `[Visual: Close-up of frustrated face looking at mirror]
(Audio: "Stop scrolling if you have acne")
[Visual: Before shot - visible breakouts]
(Audio: "I tried literally everything. Expensive derms, random Amazon products, even toothpaste - don't judge")
[Visual: Product reveal, satisfying pump]
(Audio: "Then I found this $12 cleanser and my skin cleared up in like 2 weeks")
[Visual: After shot - clear skin, natural lighting]
(Audio: "It's salicylic acid but it doesn't dry you out. Link in bio before it sells out again")`,
      },
      {
        angle: "Benefit",
        script: `[Visual: Glowing skin selfie, golden hour]
(Audio: "Stop scrolling if you have acne")
[Visual: Product in aesthetic bathroom setup]
(Audio: "POV: you finally found a cleanser that actually works")
[Visual: Applying product, foam texture ASMR]
(Audio: "Woke up with clear skin for the first time in years. No filter, no makeup")
[Visual: Close-up of smooth skin texture]
(Audio: "If you're tired of wasting money, just try this. Trust me")`,
      },
      {
        angle: "Social Proof",
        script: `[Visual: TikTok comment screenshots scrolling]
(Audio: "Stop scrolling if you have acne")
[Visual: Product with notification sounds]
(Audio: "Y'all keep asking what cleared my skin so here it is")
[Visual: Green screen with product reviews]
(Audio: "It has like 50,000 five-star reviews and dermatologists recommend it")
[Visual: Quick before/after transition]
(Audio: "I'm not gatekeeping anymore. Go get it")`,
      },
    ],
  },
  {
    hook: "This is your sign to start that side hustle",
    product: "Dropshipping course for beginners",
    scripts: [
      {
        angle: "Pain Point",
        script: `[Visual: Alarm clock, groggy morning commute]
(Audio: "This is your sign to start that side hustle")
[Visual: Sad desk lunch, fluorescent office]
(Audio: "I was literally crying in my car every day before work")
[Visual: Laptop with dashboard showing sales]
(Audio: "Now I make more from my side hustle than my 9-5")
[Visual: Working from coffee shop, relaxed]
(Audio: "It's not magic, I just learned dropshipping. Link has everything you need")`,
      },
    ],
  },
  {
    hook: "Wait til the end trust me",
    product: "Portable blender for smoothies",
    scripts: [
      {
        angle: "Benefit",
        script: `[Visual: Mystery product covered]
(Audio: "Wait til the end trust me")
[Visual: Making smoothie in regular blender, messy cleanup]
(Audio: "If you're still making smoothies like this... I'm so sorry")
[Visual: Reveal portable blender, satisfying blend]
(Audio: "This thing blends in 30 seconds and you drink straight from it")
[Visual: Taking it to gym, car, office]
(Audio: "No dishes, no cords, no excuses. Best purchase of 2024")`,
      },
    ],
  },
];

export const SYSTEM_PROMPT = `You are a viral TikTok ad scriptwriter who creates authentic UGC-style content.

CRITICAL RULES:
1. Scripts must sound like a real person talking to their phone, NOT corporate marketing
2. Use casual language: "literally", "like", "y'all", "trust me", "no cap"
3. Include specific details that feel real (prices, timeframes, personal anecdotes)
4. Visual directions should be simple and achievable with a phone
5. Scripts should be 15-30 seconds when read aloud (roughly 60-100 words)
6. The hook MUST be the first line of audio
7. Include urgency or scarcity naturally ("before it sells out", "limited time")

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "scripts": [
    {
      "angle": "Pain Point",
      "script": "[Visual: ...]\n(Audio: ...)\n..."
    },
    {
      "angle": "Benefit",
      "script": "[Visual: ...]\n(Audio: ...)\n..."
    },
    {
      "angle": "Social Proof",
      "script": "[Visual: ...]\n(Audio: ...)\n..."
    }
  ]
}`;

export function buildUserPrompt(hook: string, product: string): string {
  // Select 2 relevant examples for few-shot
  const examples = FEW_SHOT_EXAMPLES.slice(0, 2)
    .map(
      (ex, i) => `
EXAMPLE ${i + 1}:
Hook: "${ex.hook}"
Product: ${ex.product}
Output:
${JSON.stringify({ scripts: ex.scripts.map((s) => ({ angle: s.angle, script: s.script })) }, null, 2)}
`,
    )
    .join("\n");

  return `${examples}

NOW GENERATE FOR:
Hook: "${hook}"
Product: ${product}

Remember:
- Hook MUST be the first spoken line
- Sound like a real TikToker, not an AI
- Include [Visual] and (Audio) formatting
- Make each angle genuinely different

Generate 3 scripts:`;
}

// AI configuration
export const AI_CONFIG = {
  model: "@cf/meta/llama-3.1-70b-instruct",
  temperature: 0.75, // User feedback: 0.7-0.8 for creativity
  max_tokens: 2048,
};
```

### 4.2 Generation Service

```typescript
// src/lib/services/generation.ts
import { AI_CONFIG, SYSTEM_PROMPT, buildUserPrompt } from "../prompts";
import { createDb } from "../db";
import { users, generatedScripts, hooks } from "../schema";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface GenerationResult {
  success: boolean;
  scripts?: Array<{ angle: string; script: string }>;
  error?: string;
  creditsRemaining?: number;
}

export async function generateScripts(
  ai: Ai,
  d1: D1Database,
  userId: string,
  hookId: string,
  productDescription: string,
): Promise<GenerationResult> {
  const db = createDb(d1);

  // 1. Check and deduct credit atomically
  const creditResult = await db
    .update(users)
    .set({ credits: sql`credits - 1` })
    .where(sql`${users.id} = ${userId} AND ${users.credits} >= 1`)
    .returning({ credits: users.credits });

  if (creditResult.length === 0) {
    return { success: false, error: "INSUFFICIENT_CREDITS" };
  }

  // 2. Get hook text
  const hook = await db.query.hooks.findFirst({
    where: eq(hooks.id, hookId),
  });

  if (!hook) {
    // Refund credit
    await db
      .update(users)
      .set({ credits: sql`credits + 1` })
      .where(eq(users.id, userId));
    return { success: false, error: "HOOK_NOT_FOUND" };
  }

  // 3. Call Workers AI
  try {
    const response = await ai.run(AI_CONFIG.model, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(hook.text, productDescription),
        },
      ],
      temperature: AI_CONFIG.temperature,
      max_tokens: AI_CONFIG.max_tokens,
    });

    // 4. Parse response
    const content = response.response || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      !parsed.scripts ||
      !Array.isArray(parsed.scripts) ||
      parsed.scripts.length !== 3
    ) {
      throw new Error("Invalid scripts structure");
    }

    // 5. Save to database
    await db.insert(generatedScripts).values({
      id: nanoid(),
      userId,
      hookId,
      productDescription,
      scripts: JSON.stringify(parsed.scripts),
    });

    return {
      success: true,
      scripts: parsed.scripts,
      creditsRemaining: creditResult[0].credits,
    };
  } catch (error) {
    // Refund credit on AI failure
    await db
      .update(users)
      .set({ credits: sql`credits + 1` })
      .where(eq(users.id, userId));

    console.error("Generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "GENERATION_FAILED",
    };
  }
}
```

---

## 5. Fake Door Testing Strategy (User Feedback Integration)

### 5.1 "Analyze URL" Spy Feature Validation

Before building the competitor URL analysis feature (Phase 2), we validate demand with a fake door:

```typescript
// src/components/FakeDoorAnalyzeUrl.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, Link as LinkIcon } from 'lucide-react';

export function FakeDoorAnalyzeUrl() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleClick() {
    // Track fake door click
    await fetch('/api/track-fake-door', {
      method: 'POST',
      body: JSON.stringify({ feature: 'analyze_url' }),
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email, featureInterest: 'spy' }),
    });
    setSubmitted(true);
  }

  return (
    <>
      <div className="relative group">
        <Button
          variant="outline"
          className="gap-2 border-dashed border-2 hover:border-solid"
          onClick={handleClick}
        >
          <LinkIcon className="h-4 w-4" />
          Analyze URL
          <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </Button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Spy Mode Coming Soon!
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-6">
              <p className="text-lg font-medium text-green-600">You're on the list!</p>
              <p className="text-muted-foreground mt-2">
                We'll email you when URL analysis launches.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-muted-foreground">
                Paste any TikTok ad URL and we'll analyze the hook, script structure, and engagement patterns.
                Be first to know when it launches!
              </p>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Notify Me
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 5.2 Fake Door Tracking API

```typescript
// src/app/api/track-fake-door/route.ts
import { getServerSession } from "next-auth";
import { createDb } from "@/lib/db";
import { fakeDoorClicks } from "@/lib/schema";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { feature } = await request.json();
  const session = await getServerSession();

  const db = createDb(process.env.DB as unknown as D1Database);

  await db.insert(fakeDoorClicks).values({
    id: nanoid(),
    userId: session?.user?.id || null,
    feature,
    userAgent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
  });

  return NextResponse.json({ success: true });
}
```

### 5.3 Validation Criteria

| Metric           | Target           | Action if Met                      |
| ---------------- | ---------------- | ---------------------------------- |
| Fake door clicks | >15% of users    | Prioritize spy feature for Phase 2 |
| Email signups    | >30% of clickers | Strong demand signal               |
| Return rate      | >50%             | Users checking back for feature    |

---

## 6. Semi-Automated Hook Scraping Pipeline (User Feedback Integration)

### 6.1 Architecture

Instead of fully manual hook curation, we implement a semi-automated pipeline:

```
TikTok Creative Center -> Puppeteer Scraper -> Review Queue -> Manual Approval -> Production
```

### 6.2 Scraper Script

```typescript
// scripts/scrape-hooks.ts
import puppeteer from "puppeteer";
import { writeFileSync } from "fs";

interface ScrapedHook {
  text: string;
  engagementScore: number;
  source: string;
  category: string;
  scrapedAt: string;
}

async function scrapeTikTokCreativeCenter(
  category: string,
): Promise<ScrapedHook[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to TikTok Creative Center top ads
  await page.goto(
    `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=7&region=US`,
    {
      waitUntil: "networkidle2",
    },
  );

  // Wait for ads to load
  await page.waitForSelector('[data-testid="ad-card"]', { timeout: 10000 });

  // Extract hook patterns (first 3 seconds text)
  const hooks = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="ad-card"]');
    return Array.from(cards)
      .slice(0, 20)
      .map((card) => {
        const textEl = card.querySelector(".ad-text");
        const likesEl = card.querySelector(".likes-count");
        return {
          text: textEl?.textContent?.slice(0, 100) || "",
          likes: parseInt(likesEl?.textContent?.replace(/[^0-9]/g, "") || "0"),
        };
      });
  });

  await browser.close();

  // Transform to ScrapedHook format
  return hooks
    .filter((h) => h.text.length > 10)
    .map((h) => ({
      text: h.text,
      engagementScore: Math.min(100, Math.floor(h.likes / 10000)),
      source: "tiktok_creative_center",
      category,
      scrapedAt: new Date().toISOString(),
    }));
}

async function main() {
  const categories = ["beauty", "tech", "finance", "pets", "fitness", "food"];
  const allHooks: ScrapedHook[] = [];

  for (const category of categories) {
    console.log(`Scraping ${category}...`);
    const hooks = await scrapeTikTokCreativeCenter(category);
    allHooks.push(...hooks);
    // Rate limiting
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Save to review queue
  writeFileSync(
    `data/hook-review-queue-${Date.now()}.json`,
    JSON.stringify(allHooks, null, 2),
  );

  console.log(`Scraped ${allHooks.length} hooks for review`);
}

main().catch(console.error);
```

### 6.3 Admin Review Interface

```typescript
// src/app/admin/hooks/page.tsx
import { createDb } from '@/lib/db';
import { hooks } from '@/lib/schema';
import { HookReviewCard } from './HookReviewCard';
import { getReviewQueue } from '@/lib/services/hooks';

export default async function AdminHooksPage() {
  const queue = await getReviewQueue();

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Hook Review Queue</h1>
      <p className="text-muted-foreground mb-8">
        {queue.length} hooks pending review
      </p>

      <div className="grid gap-4">
        {queue.map((hook) => (
          <HookReviewCard
            key={hook.id}
            hook={hook}
            onApprove={async () => {
              'use server';
              const db = createDb(process.env.DB as unknown as D1Database);
              await db.insert(hooks).values({
                id: hook.id,
                text: hook.text,
                category: hook.category,
                engagementScore: hook.engagementScore,
                source: hook.source,
                isActive: true,
              });
            }}
            onReject={async () => {
              'use server';
              // Remove from queue
            }}
            onEdit={async (editedText: string) => {
              'use server';
              // Update and approve
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 6.4 Workflow

1. **Weekly**: Run `npm run scrape-hooks` to populate review queue
2. **Manual Review**: Admin visits `/admin/hooks` to approve/edit/reject
3. **Quality Gate**: Only hooks with engagement score >80 auto-suggested for approval
4. **Deduplication**: Fuzzy matching prevents near-duplicate hooks
5. **Refresh**: Target 10 new hooks per week to maintain freshness

---

## 7. Health Monitoring Endpoint (User Feedback Integration)

```typescript
// src/app/api/health/route.ts
import { createDb } from "@/lib/db";
import { users, hooks } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: { status: string; latencyMs: number };
    ai: { status: string; latencyMs: number };
    cache: { status: string };
  };
  stats: {
    totalUsers: number;
    totalHooks: number;
    activeHooks: number;
  };
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {
    database: { status: "unknown", latencyMs: 0 },
    ai: { status: "unknown", latencyMs: 0 },
    cache: { status: "unknown" },
  };

  let stats = { totalUsers: 0, totalHooks: 0, activeHooks: 0 };

  // Check Database
  try {
    const dbStart = Date.now();
    const db = createDb(process.env.DB as unknown as D1Database);

    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const [hookCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(hooks);
    const [activeHookCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(hooks)
      .where(sql`is_active = 1`);

    stats = {
      totalUsers: userCount.count,
      totalHooks: hookCount.count,
      activeHooks: activeHookCount.count,
    };

    checks.database = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
    };
  }

  // Check AI (lightweight ping)
  try {
    const aiStart = Date.now();
    const ai = process.env.AI as unknown as Ai;
    await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });
    checks.ai = {
      status: "healthy",
      latencyMs: Date.now() - aiStart,
    };
  } catch (error) {
    checks.ai = {
      status: "degraded",
      latencyMs: Date.now() - startTime,
    };
  }

  // Check Cache
  try {
    const cache = caches.default;
    checks.cache = { status: cache ? "healthy" : "unavailable" };
  } catch {
    checks.cache = { status: "unavailable" };
  }

  // Determine overall status
  const statuses = Object.values(checks).map((c) => c.status);
  let overallStatus: HealthStatus["status"] = "healthy";
  if (statuses.includes("unhealthy")) overallStatus = "unhealthy";
  else if (statuses.includes("degraded")) overallStatus = "degraded";

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    stats,
  };

  return NextResponse.json(response, {
    status:
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 200
          : 503,
  });
}
```

---

## 8. Authentication Setup

### 8.1 Auth.js Configuration with Drizzle Adapter

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createDb } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(createDb(process.env.DB as unknown as D1Database)),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add credits to session
      const db = createDb(process.env.DB as unknown as D1Database);
      const dbUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, user.id),
      });

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          credits: dbUser?.credits ?? 0,
        },
      };
    },
  },
  events: {
    async createUser({ user }) {
      // New users get 10 credits (handled by schema default)
      console.log(`New user created: ${user.email}`);
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
```

### 8.2 Auth Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### 8.3 Session Types Extension

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      credits: number;
    } & DefaultSession["user"];
  }
}
```

---

## 9. API Routes Structure

### 9.1 Generate Scripts Endpoint

```typescript
// src/app/api/generate/route.ts
import { auth } from "@/lib/auth";
import { generateScripts } from "@/lib/services/generation";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GenerateSchema = z.object({
  hookId: z.string().min(1),
  productDescription: z.string().min(20).max(500),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validation = GenerateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.flatten() },
      { status: 400 },
    );
  }

  const { hookId, productDescription } = validation.data;

  const result = await generateScripts(
    process.env.AI as unknown as Ai,
    process.env.DB as unknown as D1Database,
    session.user.id,
    hookId,
    productDescription,
  );

  if (!result.success) {
    const statusMap: Record<string, number> = {
      INSUFFICIENT_CREDITS: 402,
      HOOK_NOT_FOUND: 404,
      GENERATION_FAILED: 500,
    };
    return NextResponse.json(
      { error: result.error },
      { status: statusMap[result.error!] || 500 },
    );
  }

  return NextResponse.json({
    scripts: result.scripts,
    creditsRemaining: result.creditsRemaining,
  });
}
```

### 9.2 Waitlist Endpoint

```typescript
// src/app/api/waitlist/route.ts
import { auth } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { waitlist } from "@/lib/schema";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const WaitlistSchema = z.object({
  email: z.string().email(),
  featureInterest: z.enum(["unlimited", "team", "api", "spy"]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  const validation = WaitlistSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const db = createDb(process.env.DB as unknown as D1Database);

  await db.insert(waitlist).values({
    id: nanoid(),
    userId: session?.user?.id || null,
    email: validation.data.email,
    featureInterest: validation.data.featureInterest,
  });

  return NextResponse.json({ success: true });
}
```

---

## 10. Error Handling Patterns

### 10.1 Custom Error Classes

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class InsufficientCreditsError extends AppError {
  constructor() {
    super("INSUFFICIENT_CREDITS", "No credits remaining", 402);
  }
}

export class HookNotFoundError extends AppError {
  constructor(hookId: string) {
    super("HOOK_NOT_FOUND", `Hook ${hookId} not found`, 404);
  }
}

export class GenerationFailedError extends AppError {
  constructor(reason: string) {
    super("GENERATION_FAILED", `Script generation failed: ${reason}`, 500);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("RATE_LIMIT", "Too many requests", 429);
  }
}
```

### 10.2 Global Error Handler

```typescript
// src/lib/api-utils.ts
import { AppError } from "./errors";
import { NextResponse } from "next/server";

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: error.flatten() },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    { status: 500 },
  );
}
```

---

## 11. Caching Strategy

### 11.1 Hook Library Caching (24hr TTL)

```typescript
// src/lib/services/hooks.ts
import { createDb } from "../db";
import { hooks } from "../schema";
import { eq } from "drizzle-orm";

const CACHE_TTL = 60 * 60 * 24; // 24 hours

export async function getHooks(d1: D1Database, category?: string) {
  const cacheKey = `hooks:${category || "all"}`;
  const cache = caches.default;

  // Try cache first
  const cached = await cache.match(new Request(`https://cache/${cacheKey}`));
  if (cached) {
    return cached.json();
  }

  // Fetch from D1
  const db = createDb(d1);
  let query = db.query.hooks.findMany({
    where: (hooks, { eq }) => eq(hooks.isActive, true),
    orderBy: (hooks, { desc }) => [desc(hooks.engagementScore)],
  });

  if (category) {
    query = db.query.hooks.findMany({
      where: (hooks, { and, eq }) =>
        and(eq(hooks.isActive, true), eq(hooks.category, category)),
      orderBy: (hooks, { desc }) => [desc(hooks.engagementScore)],
    });
  }

  const result = await query;

  // Store in cache
  const response = new Response(JSON.stringify(result), {
    headers: { "Cache-Control": `max-age=${CACHE_TTL}` },
  });
  await cache.put(new Request(`https://cache/${cacheKey}`), response.clone());

  return result;
}
```

---

## 12. File Structure

```
adocavo.net/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Hook library (home)
│   │   ├── remix/[id]/
│   │   │   └── page.tsx            # Script generator
│   │   ├── dashboard/
│   │   │   └── page.tsx            # User history
│   │   ├── auth/
│   │   │   ├── signin/page.tsx     # Sign in page
│   │   │   └── error/page.tsx      # Auth error page
│   │   ├── admin/
│   │   │   └── hooks/page.tsx      # Hook review queue
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── generate/route.ts
│   │       ├── waitlist/route.ts
│   │       ├── health/route.ts
│   │       └── track-fake-door/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── HookCard.tsx
│   │   ├── HookGrid.tsx
│   │   ├── ScriptDisplay.tsx
│   │   ├── ScriptGenerator.tsx
│   │   ├── CreditBalance.tsx
│   │   ├── WaitlistModal.tsx
│   │   ├── FakeDoorAnalyzeUrl.tsx
│   │   └── Header.tsx
│   ├── lib/
│   │   ├── auth.ts                 # Auth.js config
│   │   ├── db.ts                   # Drizzle client
│   │   ├── schema.ts               # Drizzle schema
│   │   ├── prompts.ts              # AI prompts
│   │   ├── errors.ts               # Error classes
│   │   ├── api-utils.ts            # API helpers
│   │   └── services/
│   │       ├── generation.ts       # Script generation
│   │       └── hooks.ts            # Hook queries
│   └── types/
│       └── next-auth.d.ts          # Auth type extensions
├── scripts/
│   ├── scrape-hooks.ts             # Semi-automated scraper
│   └── seed-hooks.ts               # Initial hook seeding
├── data/
│   └── hooks-seed.json             # Initial hook data
├── drizzle/
│   └── migrations/                 # Generated migrations
├── drizzle.config.ts               # Drizzle Kit config
├── wrangler.toml                   # Cloudflare config
├── next.config.js                  # Next.js config
├── tailwind.config.ts              # Tailwind config
├── package.json
└── tsconfig.json
```

---

## 13. Configuration Files

### 13.1 wrangler.toml

```toml
name = "adocavo-net"
main = ".open-next/worker.js"
compatibility_date = "2026-01-09"
compatibility_flags = ["nodejs_compat", "global_fetch_strictly_public"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[kv_namespaces]]
binding = "NEXT_INC_CACHE_KV"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
preview_id = "REPLACE_WITH_KV_PREVIEW_ID"

[[kv_namespaces]]
binding = "NEXT_TAG_CACHE_KV"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
preview_id = "REPLACE_WITH_KV_PREVIEW_ID"

[[services]]
binding = "WORKER_SELF_REFERENCE"
service = "adocavo-net"

[[d1_databases]]
binding = "DB"
database_name = "adocavo-db"
database_id = "YOUR_DATABASE_ID"

[ai]
binding = "AI"

[vars]
NEXTAUTH_URL = "https://adocavo.net"
```

### 13.2 drizzle.config.ts

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID!,
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
```

### 13.3 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
```

---

## 14. Environment Variables

### 14.1 Required Variables

```env
# Authentication
NEXTAUTH_URL=https://adocavo.net
NEXTAUTH_SECRET=your-secret-key-here

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Cloudflare (for Drizzle Kit)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_D1_DATABASE_ID=your-database-id
```

### 14.2 Security Checklist

- [ ] `.env` in `.gitignore`
- [ ] All secrets stored in Cloudflare Pages environment variables
- [ ] NEXTAUTH_SECRET is cryptographically secure (32+ chars)
- [ ] OAuth redirect URIs locked to production domain

---

## 15. Launch Checklist

### Pre-Launch

- [ ] Database schema deployed to production D1
- [ ] 50+ hooks seeded and reviewed
- [ ] OAuth providers configured with production URLs
- [ ] Environment variables set in Cloudflare Pages
- [ ] Health endpoint returning 200
- [ ] Error monitoring configured
- [ ] Custom domain DNS propagated

### Soft Launch (Week 1)

- [ ] 50 beta users invited
- [ ] Daily monitoring of error rates
- [ ] Feedback collection form active
- [ ] Credit usage patterns tracked

### Public Launch (Week 2)

- [ ] SEO content published (3+ blog posts)
- [ ] Social sharing configured
- [ ] Analytics dashboard ready
- [ ] Waitlist email sequence configured

---

## 16. Related Documentation

| Document                                                     | Purpose                                        |
| ------------------------------------------------------------ | ---------------------------------------------- |
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)     | Detailed system design, service layer patterns |
| [COMPONENT_SPECIFICATIONS.md](./COMPONENT_SPECIFICATIONS.md) | React component specs, props, accessibility    |
| [SEO_CONTENT_STRATEGY.md](./SEO_CONTENT_STRATEGY.md)         | On-page SEO, content marketing plan            |
| [ROUTING_DEPLOYMENT.md](./ROUTING_DEPLOYMENT.md)             | Next.js routing, Cloudflare deployment         |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)           | Week-by-week implementation plan               |

---

## 17. Glossary

| Term          | Definition                                                    |
| ------------- | ------------------------------------------------------------- |
| **Hook**      | The first 3 seconds of a TikTok ad that captures attention    |
| **Remix**     | Using an existing hook pattern with a new product             |
| **Script**    | Complete ad script with visual and audio directions           |
| **Credit**    | Unit of currency for script generation (1 credit = 3 scripts) |
| **Fake Door** | Feature placeholder to validate demand before building        |
| **WAU**       | Weekly Active Users (generating 3+ scripts)                   |

---

**Document Owner**: Engineering Team
**Review Cycle**: Weekly during development, monthly post-launch
