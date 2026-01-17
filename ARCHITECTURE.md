# Adocavo Intelligence - Architecture

**Current Version:** 2.0.0
**Last Updated:** 2025-01-16
**Status:** Production-Ready

---

## Executive Summary

Adocavo is an AI-powered short video ad script generation platform built entirely on Cloudflare's edge computing platform. The system generates TikTok/Reels/Shorts ad scripts based on viral video hooks and product descriptions.

- **Platform:** Next.js 15 + Cloudflare Workers
- **AI Model:** Llama 3.1 8B via Workers AI
- **Database:** D1 (SQLite at the edge)
- **Deployment:** OpenNext for Cloudflare Workers
- **Current Status:** Production deployed at https://adocavo.net

---

## Tech Stack

| Component          | Technology          | Version        | Purpose                         |
| ------------------ | ------------------- | -------------- | ------------------------------- |
| **Frontend**       | Next.js             | 15.1.11        | React framework with App Router |
| **UI Components**  | Radix UI            | Latest         | Headless component library      |
| **Styling**        | Tailwind CSS        | 3.4.16         | Utility-first CSS               |
| **Runtime**        | OpenNext            | 1.14.8         | Next.js adapter for Cloudflare  |
| **Database**       | D1                  | -              | SQLite at the edge              |
| **ORM**            | Drizzle ORM         | 0.38.0         | Type-safe database client       |
| **AI**             | Workers AI          | -              | Llama 3.1 8B model              |
| **Authentication** | NextAuth            | 5.0.0-beta.25  | OAuth (Google, GitHub)          |
| **Testing**        | Vitest + Playwright | 2.1.8 / 1.57.0 | Unit and E2E tests              |
| **Deployment**     | Wrangler            | 4.58.0         | Cloudflare CLI                  |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Browser     │  │  Mobile      │  │  API Client  │              │
│  │  (Next.js)   │  │  (Responsive)│  │  (External)  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼──────────────────┼──────────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────────┐
│                    Cloudflare CDN / Edge                            │
│                             │                                        │
│  ┌──────────────────────────┴──────────────────────────────────┐   │
│  │                   Cloudflare Workers                          │   │
│  │  ┌─────────────────────────────────────────────────────────┐│   │
│  │  │          OpenNext Worker (adocavo-net)                  ││   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐││   │
│  │  │  │ Next.js     │ │ API Routes  │ │ Middleware           │││   │
│  │  │  │ App Router  │ │ (Edge)      │ │ (Auth, Rate Limit)   │││   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────────────┘││   │
│  │  └─────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                        │
│  ┌──────────────────────────┴──────────────────────────────────┐   │
│  │                    Bindings                                  │   │
│  │  ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────────┐    │   │
│  │  │ D1 (DB)  │ │ KV   │ │ R2   │ │ AI   │ │ Assets     │    │   │
│  │  └──────────┘ └──────┘ └──────┘ └──────┘ └────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
adocavo.net/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth-protected routes
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (marketing)/              # Public marketing pages
│   │   │   ├── [niche]/
│   │   │   ├── hooks/
│   │   │   ├── blog/[slug]/         # Blog post pages
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (tools)/                  # Tool pages
│   │   │   ├── remixer/
│   │   │   ├── script-history/
│   │   │   └── layout.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── analyze-product/      # Product URL analysis
│   │   │   ├── generate/
│   │   │   ├── hooks/
│   │   │   ├── health/
│   │   │   ├── admin/
│   │   │   └── ...
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Homepage
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── HomepageGenerator.tsx
│   │   ├── ScriptGenerator.tsx
│   │   ├── ScriptOutput.tsx
│   │   ├── ExportButton.tsx          # Export functionality
│   │   ├── BlogContentRenderer.tsx   # Blog content loader
│   │   ├── BlogSkeleton.tsx          # Blog loading skeleton
│   │   ├── CreditBadge.tsx
│   │   └── ...
│   │
│   ├── lib/                          # Core libraries
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── db.ts                     # Drizzle client
│   │   ├── schema.ts                 # Database schema
│   │   ├── cloudflare.ts             # Cloudflare context
│   │   ├── prompts.ts                # AI prompt templates
│   │   ├── rate-limit.ts             # Rate limiting logic
│   │   ├── validations.ts            # Zod schemas
│   │   ├── url-scraper.ts            # Product URL scraping
│   │   ├── cache/                    # Caching layer
│   │   │   ├── kv-cache.ts
│   │   │   └── hierarchical-cache.ts
│   │   ├── export/                   # Export functionality
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── txt-exporter.ts
│   │   │   ├── pdf-exporter.ts
│   │   │   └── notion-formatter.ts
│   │   ├── services/                 # Business logic
│   │   │   ├── generation.ts
│   │   │   ├── hooks.ts
│   │   │   ├── credits.ts
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── data/                         # Static data
│   │   ├── blog-posts.ts
│   │   ├── category-deep-dives.ts
│   │   ├── comparison-pages.ts
│   │   └── example-niches.ts
│   │
│   └── types/                        # TypeScript definitions
│       ├── next-auth.d.ts
│       └── cloudflare.d.ts
│
├── public/content/blog/              # Blog content JSON
│   ├── index.json                    # Blog post index
│   ├── tiktok-ad-script-guide.json  # Individual posts
│   └── ...
│
├── scripts/                          # Operational scripts
│   ├── deploy.sh                     # Enhanced deployment script
│   ├── rollback.sh                   # Rollback script
│   ├── validate-env.sh               # Environment validation
│   ├── setup-secrets.sh              # Secrets setup
│   ├── monitor-deployment.sh         # Post-deployment monitoring
│   ├── notify-deployment.sh          # Deployment notifications
│   ├── migrate-db.sh                 # Database migration helper
│   ├── create-blog-metadata.ts      # Blog metadata generator
│   └── extract-blog-content.ts      # Blog content extractor
│
├── tests/                            # Test suites
│   ├── unit/                         # Unit tests (Vitest)
│   ├── integration/                  # Integration tests
│   └── e2e/                          # E2E tests (Playwright)
│
├── drizzle/migrations/               # Database migrations
│   ├── 0000_*.sql
│   ├── 0001_*.sql
│   └── ...
│
├── docs/                             # Documentation
│   ├── DEPLOYMENT.md                 # Deployment guide
│   ├── TROUBLESHOOTING.md            # Troubleshooting guide
│   ├── API.md                        # API reference
│   ├── PRODUCT-URL-ANALYSIS.md       # URL analysis feature
│   ├── EXPORT-FEATURE.md             # Export functionality
│   ├── BLOG-OPTIMIZATION.md          # Blog performance
│   └── TECHNICAL_ARCHITECTURE.md     # Detailed technical docs
│
├── .github/workflows/                # CI/CD
│   ├── ci.yml                        # Continuous integration
│   ├── deploy.yml                    # Deployment automation
│   └── performance.yml               # Performance monitoring
│
├── wrangler.toml                     # Cloudflare configuration
├── next.config.mjs                   # Next.js configuration
├── package.json
└── tsconfig.json
```

---

## Database Schema (Drizzle ORM)

### Core Tables

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 10 NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Hooks table (viral video hooks)
CREATE TABLE hooks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  engagement_score INTEGER DEFAULT 50,
  source TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Generated scripts
CREATE TABLE generated_scripts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hook_id TEXT NOT NULL,
  product_description TEXT NOT NULL,
  scripts TEXT NOT NULL,  -- JSON array
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (hook_id) REFERENCES hooks(id)
);

-- Ratings
CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  generation_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (generation_id) REFERENCES generated_scripts(id)
);

-- Waitlist
CREATE TABLE waitlist (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  interests TEXT,  -- JSON array
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Rate limiting
CREATE TABLE rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  requests_count INTEGER DEFAULT 1,
  window_start INTEGER NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
  UNIQUE(identifier, endpoint, window_start)
);

-- Admin review queue
CREATE TABLE review_queue (
  id TEXT PRIMARY KEY,
  hook_text TEXT NOT NULL,
  category TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at INTEGER,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);
```

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_hooks_category ON hooks(category);
CREATE INDEX idx_hooks_active ON hooks(is_active);
CREATE INDEX idx_scripts_user_id ON generated_scripts(user_id);
CREATE INDEX idx_scripts_created_at ON generated_scripts(created_at DESC);
CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);
```

---

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check with system status
- `GET /api/hooks` - List hooks with pagination
- `GET /api/hooks/{id}` - Get specific hook
- `POST /api/waitlist` - Join waitlist
- `POST /api/track-fake-door` - Track feature interest

### Protected Endpoints (Auth Required)

- `POST /api/generate` - Generate scripts (consumes credit)
- `GET /api/stats` - User statistics
- `POST /api/hooks/{id}/favorite` - Favorite/unfavorite hook
- `GET /api/scripts/favorites` - Get user's favorites
- `POST /api/scripts/{id}/rate` - Rate a script
- `POST /api/scripts/{id}/regenerate` - Regenerate script
- `POST /api/analyze-product` - Analyze product URL with AI

### Admin Endpoints

- `GET /api/admin/metrics` - System metrics
- `GET /api/admin/review-queue` - Pending submissions
- `POST /api/admin/review-queue/{id}` - Approve/reject hook
- `PUT /api/admin/hooks/{id}` - Update hook
- `DELETE /api/admin/hooks/{id}` - Delete hook

See [API.md](./docs/API.md) for detailed API documentation.

---

## Deployment Architecture

### Environments

| Environment | URL                         | Worker Name     | Database           |
| ----------- | --------------------------- | --------------- | ------------------ |
| Production  | https://adocavo.net         | adocavo-net     | adocavo-db         |
| Preview     | https://preview.adocavo.net | adocavo-preview | adocavo-db-preview |
| Development | https://dev.adocavo.net     | adocavo-dev     | adocavo-db-dev     |

### Deployment Flow

1. **Pre-deployment Validation**
   - Environment validation (`validate-env.sh`)
   - TypeScript compilation
   - Lint checks
   - Unit tests

2. **Build Process**
   - `npm run build` - Next.js build
   - `npm run build:open-next` - OpenNext bundle

3. **Database Operations**
   - Automatic backup
   - Apply migrations
   - Verify migration success

4. **Deployment**
   - `wrangler deploy`
   - Wait for edge propagation (45s)

5. **Health Verification**
   - Health check endpoint (15 retries)
   - Smoke tests on key endpoints
   - Post-deployment monitoring (2 minutes)

6. **Rollback on Failure**
   - Automatic rollback on critical failures
   - Manual rollback script available

### CI/CD Pipeline

GitHub Actions workflows:

- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/deploy.yml` - Automated deployment
- `.github/workflows/performance.yml` - Performance monitoring

---

## Security Features

### Authentication

- NextAuth.js v5 with OAuth (Google, GitHub)
- HTTP-only session cookies
- CSRF protection
- Automatic token rotation

### Rate Limiting

- Per-endpoint rate limits (D1-backed)
- IP-based limiting for guests
- User-based limiting for authenticated users
- Configurable windows and quotas

### Data Protection

- Input validation via Zod schemas
- SQL injection prevention (Drizzle ORM)
- XSS protection (React default escaping)
- Environment variable encryption (Wrangler secrets)
- Private IP blocking for URL scraping (SSRF prevention)

### Observability

- Structured logging
- Error tracking
- Performance metrics
- Health check endpoints

---

## Key Features

### Product URL Analysis

**Location:** `src/lib/url-scraper.ts`, `src/app/api/analyze-product/`

**Supported Platforms:**

- TikTok (video/product links)
- Amazon (product pages)
- Shopify stores
- Generic web pages

**Capabilities:**

- Extract title, description, price, images
- AI-powered selling point analysis (Workers AI)
- 24-hour result caching
- Private IP blocking for security
- Rate limiting by user tier

**Flow:**

```
User URL Input
    ↓
URL Validation (format, private IPs)
    ↓
Rate Limit Check
    ↓
Cache Lookup (24hr TTL)
    ↓
Platform Detection
    ↓
Web Scraping (timeout: 10s)
    ↓
AI Analysis (optional)
    ↓
Cache & Return Results
```

**Rate Limits:**

- Anonymous: 3/hour
- Free users: 10/hour
- Pro users: 30/hour

**Security:**

- Private IP range blocking (10.x, 172.16-31.x, 192.168.x)
- Protocol validation (http/https only)
- URL length limits (500 chars)
- Timeout protection (10 seconds)

### Export Functionality

**Location:** `src/lib/export/`, `src/components/ExportButton.tsx`

**Supported Formats:**

1. **Copy All** - Clipboard (plain text)
2. **Notion Format** - Markdown for Notion
3. **TXT Download** - Plain text file
4. **JSON Download** - Structured data
5. **PDF Download** - Professional PDF with jsPDF
6. **Email Share** - Mailto link generation

**Features:**

- Lazy-loaded icons for performance
- Loading states for PDF generation
- Visual feedback (checkmarks, spinners)
- Analytics tracking
- Graceful error handling
- Mobile-responsive dropdown

**Dependencies:**

- `jspdf` for PDF generation
- Native Clipboard API
- Native Blob/File API

### Blog System

**Location:** `src/lib/blog.ts`, `src/lib/blog-loader.ts`

**Architecture:**

- Blog content stored as JSON in `/public/content/blog/`
- Dynamic content loading on-demand
- Metadata-only for list views (~2KB initial)
- Server-side loading for SEO
- Client-side skeleton states

**Performance Optimization:**

- Bundle size reduced: ~240KB → ~2KB
- Code splitting for blog posts
- CDN caching with 1-hour TTL
- Parallel loading capability

**Workflow:**

```bash
# After editing blog content
npm run extract:blog

# Commit generated files
git add public/content/blog/
git commit -m "chore: update blog content JSON"
```

**API:**

- `getAllBlogPosts()` - Metadata only
- `getPostBySlug(slug)` - Async, loads full content
- `getPostBySlugSync(slug)` - Fallback for static generation

---

## Performance Optimizations

### Edge Caching

- Static asset caching (1 year)
- API response caching (KV)
- Hierarchical cache strategy
- Stale-while-revalidate patterns

### Database

- Prepared statements
- Composite indexes
- Query optimization
- Connection pooling (D1 native)

### Build

- Tree shaking
- Code splitting
- Dynamic imports
- Bundle size limits (50MB)

---

## Monitoring & Observability

### Health Check Endpoint

`GET /api/health` returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T10:00:00.000Z",
  "runtime": "edge",
  "latency": 123,
  "checks": {
    "database": { "status": "healthy", "latency": 45 },
    "ai": { "status": "healthy", "latency": 78 }
  }
}
```

### Logging

- Structured JSON logs
- Log levels: debug, info, warn, error
- Request tracing
- Error context

### Deployment Logs

All deployments logged to `logs/deployments/`:

- `deployment-{ENVIRONMENT}-{TIMESTAMP}.log`
- `report-{ENVIRONMENT}-{TIMESTAMP}.txt`
- `backup-{DB_NAME}-{TIMESTAMP}.sql`

---

## Scripts Reference

```bash
# Deployment
./scripts/deploy.sh [environment] [options]

# Rollback
./scripts/rollback.sh [environment]

# Environment validation
./scripts/validate-env.sh [environment]

# Secrets setup
./scripts/setup-secrets.sh [environment]

# Monitoring
./scripts/monitor-deployment.sh [environment] [duration_minutes]

# Database migration
./scripts/migrate-db.sh [environment]
```

---

## Documentation

| Document                                                      | Description                 |
| ------------------------------------------------------------- | --------------------------- |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md)                         | Complete deployment guide   |
| [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)               | Common issues and solutions |
| [API.md](./docs/API.md)                                       | API endpoint reference      |
| [TECHNICAL_ARCHITECTURE.md](./docs/TECHNICAL_ARCHITECTURE.md) | Detailed technical specs    |
| [HEALTH_CHECK.md](./docs/HEALTH_CHECK.md)                     | Health monitoring guide     |
| [SECURITY_HARDENING.md](./docs/SECURITY_HARDENING.md)         | Security best practices     |

---

## Cost Breakdown

| Service          | Usage                 | Monthly Cost            |
| ---------------- | --------------------- | ----------------------- |
| Workers Requests | <100k/day             | $0                      |
| D1 Database      | 5GB storage, 5M reads | $0                      |
| KV Storage       | 1GB, 10M reads        | $0.50                   |
| Workers AI       | ~10k neurons/day      | $0-$5                   |
| R2 Storage       | Backups               | $0.02/GB                |
| Domain           | adocavo.net           | $10/year (~$0.83/month) |

**Total:** ~$1-6/month during MVP phase

---

## Roadmap

### Completed

- [x] OAuth authentication (Google, GitHub)
- [x] AI script generation
- [x] Hook library with categories
- [x] Credit system
- [x] Rate limiting
- [x] Admin dashboard
- [x] Deployment automation
- [x] Product URL analysis (TikTok, Amazon, Shopify)
- [x] Export functionality (PDF, JSON, TXT, Notion, Email)
- [x] Blog system with dynamic loading
- [x] Performance optimizations (blog bundle size)

### In Progress

- [ ] Advanced AI models (Claude integration)
- [ ] Competitor analysis tool
- [ ] Video rendering capabilities

### Planned

- [ ] Payment integration (Stripe)
- [ ] Team/collaboration features
- [ ] API access for developers
- [ ] Mobile apps
- [ ] Google Docs export integration
- [ ] Dropbox/Google Drive export

---

## Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/adocavo.net.git
cd adocavo.net

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Start development server
npm run dev
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

---

**Last Updated:** 2025-01-16
**Version:** 2.1.0
**Maintained By:** Adocavo Team
