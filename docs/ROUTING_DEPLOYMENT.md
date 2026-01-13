# Routing & Deployment - Adocavo Intelligence

## Document Purpose

This document provides detailed specifications for Next.js App Router structure, middleware configuration, Cloudflare Pages deployment, environment variables, CI/CD pipeline, and domain setup.

**Version**: 1.0.0
**Last Updated**: 2026-01-09
**Reference**: [BLUEPRINT.md](./BLUEPRINT.md)

---

## 1. Next.js App Router Structure

### 1.1 Complete Route Map

```
src/app/
|
+-- layout.tsx              # Root layout (providers, analytics)
+-- page.tsx                # Home - Hook Library
+-- loading.tsx             # Global loading state
+-- error.tsx               # Global error boundary
+-- not-found.tsx           # 404 page
+-- sitemap.ts              # Dynamic sitemap generation
+-- robots.ts               # Robots.txt configuration
|
+-- (marketing)/            # Marketing pages (shared layout)
|   +-- layout.tsx          # Marketing layout (no auth required)
|   +-- about/
|   |   +-- page.tsx        # About page
|   +-- pricing/
|   |   +-- page.tsx        # Pricing/Coming Soon
|   +-- blog/
|       +-- page.tsx        # Blog index
|       +-- [slug]/
|           +-- page.tsx    # Individual blog post
|
+-- (app)/                  # Application pages (auth required)
|   +-- layout.tsx          # App layout with auth check
|   +-- dashboard/
|   |   +-- page.tsx        # User dashboard
|   |   +-- loading.tsx     # Dashboard loading state
|   +-- remix/
|       +-- [id]/
|           +-- page.tsx    # Script generator
|           +-- loading.tsx # Generator loading state
|
+-- category/
|   +-- [category]/
|       +-- page.tsx        # Category filtered hooks
|
+-- hook/
|   +-- [id]/
|       +-- page.tsx        # Individual hook detail (SEO)
|
+-- auth/
|   +-- signin/
|   |   +-- page.tsx        # Sign in page
|   +-- signout/
|   |   +-- page.tsx        # Sign out confirmation
|   +-- error/
|       +-- page.tsx        # Auth error page
|
+-- admin/                  # Admin routes (protected)
|   +-- layout.tsx          # Admin layout with role check
|   +-- hooks/
|       +-- page.tsx        # Hook review queue
|
+-- api/
    +-- auth/
    |   +-- [...nextauth]/
    |       +-- route.ts    # Auth.js handlers
    +-- generate/
    |   +-- route.ts        # POST: Script generation
    +-- hooks/
    |   +-- route.ts        # GET: List hooks
    |   +-- [id]/
    |       +-- route.ts    # GET: Single hook
    +-- waitlist/
    |   +-- route.ts        # POST: Waitlist signup
    +-- health/
    |   +-- route.ts        # GET: Health check
    +-- track-fake-door/
        +-- route.ts        # POST: Fake door tracking
```

### 1.2 Route Segments Explained

| Segment                | Purpose                      | Auth       | Cache     |
| ---------------------- | ---------------------------- | ---------- | --------- |
| `/`                    | Hook library homepage        | Public     | SSG + ISR |
| `/category/[category]` | Filtered hooks by category   | Public     | SSG       |
| `/hook/[id]`           | Individual hook detail (SEO) | Public     | SSG       |
| `/remix/[id]`          | Script generator             | Required   | No cache  |
| `/dashboard`           | User's generated scripts     | Required   | No cache  |
| `/blog/[slug]`         | Blog posts                   | Public     | SSG       |
| `/auth/*`              | Authentication pages         | Public     | No cache  |
| `/admin/*`             | Admin panel                  | Admin role | No cache  |
| `/api/*`               | API endpoints                | Varies     | Varies    |

---

## 2. Route Implementations

### 2.1 Root Layout

```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@/components/Analytics';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: {
    default: 'Adocavo Intelligence - TikTok Ad Script Generator',
    template: '%s | Adocavo Intelligence',
  },
  description: 'Generate viral TikTok ad scripts with AI. Browse 50+ proven hooks and create custom scripts instantly.',
  metadataBase: new URL('https://adocavo.net'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
```

### 2.2 Home Page (Hook Library)

```typescript
// src/app/page.tsx
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { HookGrid } from '@/components/HookGrid';
import { HookGridSkeleton } from '@/components/skeletons';
import { FakeDoorAnalyzeUrl } from '@/components/FakeDoorAnalyzeUrl';
import { SocialProof } from '@/components/SocialProof';
import { getHooks, getCategories } from '@/lib/services/hooks';

// Enable ISR with 1 hour revalidation
export const revalidate = 3600;

export default async function HomePage() {
  const [hooks, categories] = await Promise.all([
    getHooks(),
    getCategories(),
  ]);

  return (
    <>
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Viral TikTok Hooks Library
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
            Browse 50+ proven ad hooks and generate custom scripts instantly with AI.
            Perfect for e-commerce sellers, marketers, and UGC creators.
          </p>
          <div className="flex justify-center gap-4">
            <FakeDoorAnalyzeUrl />
          </div>
        </section>

        {/* Hook Grid */}
        <Suspense fallback={<HookGridSkeleton />}>
          <HookGrid initialHooks={hooks} categories={categories} />
        </Suspense>

        {/* Social Proof */}
        <SocialProof />
      </main>
    </>
  );
}
```

### 2.3 Remix Page (Script Generator)

```typescript
// src/app/(app)/remix/[id]/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getHookById } from '@/lib/services/hooks';
import { Header } from '@/components/Header';
import { ScriptGenerator } from '@/components/ScriptGenerator';
import { notFound } from 'next/navigation';

// Dynamic page - no caching
export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const hook = await getHookById(params.id);
  if (!hook) return { title: 'Hook Not Found' };

  return {
    title: `Remix: "${hook.text.slice(0, 30)}..."`,
    robots: { index: false }, // Don't index remix pages
  };
}

export default async function RemixPage({ params }: Props) {
  const session = await auth();

  if (!session) {
    redirect(`/auth/signin?callbackUrl=/remix/${params.id}`);
  }

  const hook = await getHookById(params.id);

  if (!hook) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <ScriptGenerator hook={hook} />
      </main>
    </>
  );
}
```

### 2.4 Dashboard Page

```typescript
// src/app/(app)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Header } from '@/components/Header';
import { ScriptHistory } from '@/components/ScriptHistory';
import { CreditBalance } from '@/components/CreditBalance';
import { getUserScripts } from '@/lib/services/scripts';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Scripts',
  robots: { index: false },
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const scripts = await getUserScripts(session.user.id);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Scripts</h1>
          <CreditBalance />
        </div>

        <ScriptHistory
          scripts={scripts}
          onDelete={async (id) => {
            'use server';
            await deleteScript(id, session.user.id);
          }}
        />
      </main>
    </>
  );
}
```

### 2.5 Category Page

```typescript
// src/app/category/[category]/page.tsx
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { HookGrid } from '@/components/HookGrid';
import { getHooksByCategory } from '@/lib/services/hooks';
import type { HookCategory } from '@/lib/schema';

// Static generation for category pages
export async function generateStaticParams() {
  const categories: HookCategory[] = ['beauty', 'tech', 'fitness', 'finance', 'pets', 'food'];
  return categories.map((category) => ({ category }));
}

export const revalidate = 3600; // ISR: 1 hour

const validCategories = ['beauty', 'tech', 'fitness', 'finance', 'pets', 'food'];

interface Props {
  params: { category: string };
}

export async function generateMetadata({ params }: Props) {
  if (!validCategories.includes(params.category)) {
    return { title: 'Category Not Found' };
  }

  const category = params.category;
  return {
    title: `${capitalize(category)} TikTok Ad Hooks`,
    description: `Discover viral ${category} TikTok hooks and generate custom ad scripts. Browse proven patterns for ${category} product marketing.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  if (!validCategories.includes(params.category)) {
    notFound();
  }

  const category = params.category as HookCategory;
  const hooks = await getHooksByCategory(category);

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex gap-2 text-sm text-gray-500">
            <li><a href="/" className="hover:text-primary-600">Home</a></li>
            <li>/</li>
            <li className="capitalize font-medium text-gray-900">{category}</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold capitalize mb-2">
          {category} TikTok Ad Hooks
        </h1>
        <p className="text-gray-600 mb-8">
          {hooks.length} proven hooks for {category} product ads
        </p>

        <HookGrid initialHooks={hooks} categories={[]} />
      </main>
    </>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

---

## 3. Middleware Configuration

### 3.1 Main Middleware

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/remix", "/admin"];

// Routes that require admin role
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check protected routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtectedRoute && !token) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check admin routes
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Add security headers
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com",
  );

  // Add cache headers for static assets
  if (pathname.startsWith("/_next/static")) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
```

### 3.2 Rate Limiting Middleware

```typescript
// src/lib/middleware/rate-limit.ts
import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/generate": { requests: 10, window: 60 },
  "/api/waitlist": { requests: 3, window: 300 },
  "/api/hooks": { requests: 100, window: 60 },
};

// In-memory store (use KV in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  request: NextRequest,
  path: string,
): NextResponse | null {
  const config = RATE_LIMITS[path];
  if (!config) return null;

  // Use IP or user ID as key
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const key = `${path}:${ip}`;

  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now > record.resetAt) {
    requestCounts.set(key, {
      count: 1,
      resetAt: now + config.window * 1000,
    });
    return null;
  }

  if (record.count >= config.requests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Retry after ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.requests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(record.resetAt),
        },
      },
    );
  }

  record.count++;
  requestCounts.set(key, record);

  return null;
}
```

---

## 4. Cloudflare Workers Deployment (OpenNext)

### 4.1 wrangler.toml Configuration

```toml
# wrangler.toml
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

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "adocavo-db"
database_id = "your-database-id-here"

# Workers AI binding
[ai]
binding = "AI"

# Environment variables (non-secret)
[vars]
NEXTAUTH_URL = "https://adocavo.net"
NODE_ENV = "production"

# Preview environment
[env.preview]
name = "adocavo-preview"

[env.preview.vars]
NEXTAUTH_URL = "https://preview.adocavo.net"

# Development environment
[env.development]
name = "adocavo-dev"

[[env.development.d1_databases]]
binding = "DB"
database_name = "adocavo-db-dev"
database_id = "your-dev-database-id-here"
```

### 4.2 next.config.js for Cloudflare

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Cloudflare Pages
  output: "standalone",

  // Image optimization
  images: {
    unoptimized: true, // Cloudflare doesn't support next/image optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/library",
        destination: "/",
        permanent: true,
      },
      {
        source: "/hooks",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

### 4.3 Cloudflare Adapter Setup

```typescript
// src/lib/cloudflare.ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Type definitions for Cloudflare bindings
export interface Env {
  DB: D1Database;
  AI: Ai;
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// Helper to get bindings in API routes
export function getBindings(): Env {
  const context = getCloudflareContext();
  return context.env as Env;
}

// Usage in API routes:
// const { DB, AI } = getBindings();
```

### 4.4 Build Configuration

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:open-next": "opennextjs-cloudflare build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "deploy:preview": "opennextjs-cloudflare build && opennextjs-cloudflare deploy --env preview",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "wrangler d1 migrations apply adocavo-db --remote",
    "db:migrate:local": "wrangler d1 migrations apply adocavo-db --local"
  }
}
```

---

## 5. Environment Variables

### 5.1 Required Variables

```bash
# .env.local (development)
# DO NOT COMMIT THIS FILE

# Auth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-at-least-32-chars

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

### 5.2 Cloudflare Pages Secrets

Set these in Cloudflare Pages dashboard (Settings > Environment variables):

| Variable               | Environment         | Type   |
| ---------------------- | ------------------- | ------ |
| `NEXTAUTH_SECRET`      | Production, Preview | Secret |
| `GOOGLE_CLIENT_ID`     | Production, Preview | Plain  |
| `GOOGLE_CLIENT_SECRET` | Production, Preview | Secret |
| `GITHUB_CLIENT_ID`     | Production, Preview | Plain  |
| `GITHUB_CLIENT_SECRET` | Production, Preview | Secret |

### 5.3 Environment Variable Validation

```typescript
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  // Node
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

// Validate on startup
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

// Singleton for validated env
let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (!validatedEnv) {
    validatedEnv = validateEnv();
  }
  return validatedEnv;
}
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-preview:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXTAUTH_URL: https://preview.adocavo.net
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Deploy to Preview
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: adocavo
          directory: .vercel/output/static
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_D1_DATABASE_ID: ${{ secrets.CLOUDFLARE_D1_DATABASE_ID }}

      - name: Build
        run: npm run build
        env:
          NEXTAUTH_URL: https://adocavo.net
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Deploy to Production
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: adocavo
          directory: .vercel/output/static
          branch: main

      - name: Notify deployment
        run: |
          echo "Deployed to production: https://adocavo.net"
```

### 6.2 Pre-commit Hooks

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run typecheck
```

---

## 7. Domain Setup

### 7.1 Cloudflare DNS Configuration

```
# DNS Records for adocavo.net

# Root domain
Type: CNAME
Name: @
Content: adocavo.pages.dev
Proxy: Yes (Orange cloud)
TTL: Auto

# WWW redirect
Type: CNAME
Name: www
Content: adocavo.pages.dev
Proxy: Yes (Orange cloud)
TTL: Auto

# Preview subdomain (optional)
Type: CNAME
Name: preview
Content: adocavo.pages.dev
Proxy: Yes (Orange cloud)
TTL: Auto
```

### 7.2 Custom Domain in Cloudflare Pages

1. Go to Cloudflare Pages > adocavo > Custom domains
2. Click "Set up a custom domain"
3. Enter `adocavo.net`
4. Click "Activate domain"
5. Repeat for `www.adocavo.net`

### 7.3 SSL/TLS Configuration

In Cloudflare dashboard (SSL/TLS):

- Mode: **Full (Strict)**
- Always Use HTTPS: **On**
- Automatic HTTPS Rewrites: **On**
- Minimum TLS Version: **1.2**

### 7.4 Page Rules

```
# Force HTTPS
URL: http://*adocavo.net/*
Setting: Always Use HTTPS

# WWW to root redirect
URL: www.adocavo.net/*
Setting: Forwarding URL (301)
Destination: https://adocavo.net/$1

# Cache static assets
URL: *adocavo.net/_next/static/*
Setting: Cache Level = Cache Everything
Edge Cache TTL: 1 month
```

---

## 8. Health Monitoring

### 8.1 Health Endpoint Implementation

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { users, hooks } from "@/lib/schema";
import { sql } from "drizzle-orm";

interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  details?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: HealthCheck[];
  stats?: {
    totalUsers: number;
    totalHooks: number;
    activeHooks: number;
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];
  let stats = undefined;

  const { DB, AI } = getBindings();

  // Database check
  try {
    const dbStart = Date.now();
    const db = createDb(DB);

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

    checks.push({
      service: "database",
      status: "healthy",
      latencyMs: Date.now() - dbStart,
    });
  } catch (error) {
    checks.push({
      service: "database",
      status: "unhealthy",
      latencyMs: Date.now() - startTime,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // AI check
  try {
    const aiStart = Date.now();
    await AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    });

    checks.push({
      service: "ai",
      status: "healthy",
      latencyMs: Date.now() - aiStart,
    });
  } catch (error) {
    checks.push({
      service: "ai",
      status: "degraded",
      latencyMs: Date.now() - startTime,
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Determine overall status
  const hasUnhealthy = checks.some((c) => c.status === "unhealthy");
  const hasDegraded = checks.some((c) => c.status === "degraded");

  const overallStatus = hasUnhealthy
    ? "unhealthy"
    : hasDegraded
      ? "degraded"
      : "healthy";

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks,
    stats,
  };

  return NextResponse.json(response, {
    status: overallStatus === "unhealthy" ? 503 : 200,
  });
}
```

### 8.2 Uptime Monitoring

Set up external monitoring (e.g., Uptime Robot, Better Uptime):

- URL: `https://adocavo.net/api/health`
- Method: GET
- Interval: 5 minutes
- Expected status: 200
- Alert on: Status != 200 or response time > 5000ms

---

## 9. Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Environment variables set in Cloudflare
- [ ] Database migrations applied
- [ ] OAuth redirect URIs updated

### Post-Deployment

- [ ] Health endpoint returns 200
- [ ] Authentication flow works
- [ ] Script generation works
- [ ] No console errors in browser
- [ ] SSL certificate active
- [ ] DNS propagation complete

### Rollback Procedure

1. Go to Cloudflare Pages > Deployments
2. Find last known good deployment
3. Click "Rollback to this deployment"
4. Verify rollback successful via health endpoint

---

## 10. Operations & Backups

### 10.1 D1 → R2 Scheduled Backups

We run a dedicated backup worker that dumps the D1 database to R2 on a cron
schedule. This keeps production data recoverable independently from Cloudflare
Time Travel.

**Worker entrypoint**: `workers/backup/worker.ts`  
**Wrangler config**: `wrangler.backup.toml`

**Cron schedule** (default): `0 3 * * *` (daily at 03:00 UTC)  
**Backup key prefix**: `d1-backups/`  
**Retention**: `BACKUP_RETENTION_DAYS` (default 30 days)

### 10.2 Manual Backup Trigger

The backup worker exposes a protected manual trigger:

```
POST /backup
Header: x-backup-token: $BACKUP_WEBHOOK_TOKEN
```

### 10.3 Required Bindings

```
[[d1_databases]]
binding = "DB"

[[r2_buckets]]
binding = "R2_BACKUPS"
```

Set the secret via Wrangler:

```
wrangler secret put BACKUP_WEBHOOK_TOKEN --config wrangler.backup.toml
```

---

## 11. Related Documentation

| Document                                                 | Purpose                     |
| -------------------------------------------------------- | --------------------------- |
| [BLUEPRINT.md](./BLUEPRINT.md)                           | Master implementation guide |
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) | Service layer patterns      |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)       | Implementation timeline     |

---

**Document Owner**: Engineering Team
**Review Cycle**: Monthly
