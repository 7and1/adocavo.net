# Adocavo Intelligence

AI-powered short video ad script generator for TikTok/Reels/Shorts.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Platform:** Cloudflare Workers + D1 + Workers AI
- **Auth:** Auth.js v5 (OAuth: Google, GitHub)
- **Database:** Drizzle ORM with SQLite
- **UI:** Tailwind CSS + shadcn/ui
- **Export:** jsPDF, native Clipboard/Blob APIs

## Key Features

### Script Generation

- AI-powered script generation using Llama 3.1 8B
- Multiple creative angles per generation (3 scripts)
- Viral hook library with 500+ hooks
- Category-based hook selection (beauty, tech, finance, pets, fitness, food)

### Product URL Analysis

- **Supported Platforms:** TikTok, Amazon, Shopify, generic web pages
- Extract title, description, price, images
- AI-powered selling point analysis
- 24-hour result caching

### Export Options

- Copy to clipboard (plain text, Notion format)
- Download as TXT, JSON, or PDF
- Email client integration

### Performance

- Bundle size optimized (~240KB → ~2KB for blog)
- CDN-cached content with 1-hour TTL
- Edge caching for API responses

### Security

- Private IP blocking (SSRF prevention)
- Rate limiting by user tier
- Input validation (Zod schemas)
- Environment variable encryption

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local

# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Edit .env.local with your values
# - NEXTAUTH_SECRET (required)
# - OAuth credentials (optional)

# Start dev server (Next.js)
npm run dev
```

### Production Deployment

**Quick deployment guide:**

```bash
# 1. Validate environment
./scripts/validate-env.sh

# 2. Setup Cloudflare resources (first time only)
wrangler kv namespace create NEXT_INC_CACHE_KV
wrangler kv namespace create NEXT_TAG_CACHE_KV
wrangler d1 create adocavo-db

# 3. Configure wrangler.toml
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml with your resource IDs

# 4. Run migrations
npm run db:migrate

# 5. Setup secrets
./scripts/setup-secrets.sh production

# 6. Deploy
npm run deploy
```

**Full deployment guide:** See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete instructions including:

- Initial setup
- Environment configuration
- Database migrations
- Secrets management
- CI/CD pipeline
- Rollback procedures
- Monitoring and troubleshooting

## Local Development Notes

- `npm run dev` runs Next.js locally
- `npm run preview` builds and validates the Workers runtime output
- For local development with D1, set `CLOUDFLARE_*` values in `.env.local`
- Set secrets in Cloudflare dashboard for production deployment

## Observability & Monitoring

### Health Checks

```bash
# Check production health
curl https://adocavo.net/api/health

# Check preview health
curl https://preview.adocavo.net/api/health
```

### Logging

```bash
# Tail production logs
wrangler tail

# Tail preview logs
wrangler tail --env preview
```

### Images & Media

- **Cloudflare Image Resizing**: set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_IMAGE_LOADER=cloudflare`
- **Log drain** (optional): set `LOG_DRAIN_PROVIDER`, `LOG_DRAIN_URL`, and `LOG_DRAIN_TOKEN` (secret) for Axiom/BetterStack/Datadog

## Backups

- Scheduled D1 → R2 backups are handled by the backup worker (`workers/backup/worker.ts`)
- Deploy it via `npm run deploy:backup` using `wrangler.backup.toml`
- Set `BACKUP_WEBHOOK_TOKEN` to enable manual `POST /backup` triggers
- **Manual backup:** `wrangler d1 export adocavo-db --remote --output=backup.sql`

## Key Scripts

### Development

```bash
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run typecheck        # TypeScript type checking
npm run lint             # Run ESLint
npm run test             # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
```

### Database

```bash
npm run db:generate      # Generate migration from schema
npm run db:migrate       # Run migrations on remote database
npm run db:push          # Push schema changes (dev only)
npm run seed:hooks       # Seed hooks data
npm run seed:review-queue # Import review queue
```

### Deployment

```bash
npm run deploy           # Deploy to production
npm run deploy:preview   # Deploy to preview environment
npm run preview          # Build and preview locally
```

### Operations

```bash
./scripts/validate-env.sh     # Validate environment configuration
./scripts/setup-secrets.sh    # Interactive secrets setup
./scripts/rollback.sh         # Rollback deployment
```

## Architecture

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Complete deployment guide
- **[docs/API.md](docs/API.md)** - API endpoint reference
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[docs/PRODUCT-URL-ANALYSIS.md](docs/PRODUCT-URL-ANALYSIS.md)** - URL analysis feature
- **[docs/EXPORT-FEATURE.md](docs/EXPORT-FEATURE.md)** - Export functionality
- **[docs/BLOG-OPTIMIZATION.md](docs/BLOG-OPTIMIZATION.md)** - Blog performance
- **[docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md)** - Technical specs
- **[docs/SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md)** - Security best practices

## CI/CD

The project uses GitHub Actions for automated deployment:

- **Push to `main`**: Deploys to production (https://adocavo.net)
- **Pull requests**: Deploys to preview (https://preview.adocavo.net)
- **All deployments**: Run tests, migrations, health checks, and smoke tests

See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for details.

## Troubleshooting

### Common Issues

**Migration failures:**

```bash
wrangler d1 migrations list adocavo-db --remote
wrangler d1 migrations apply adocavo-db --remote --verbose
```

**Health check failures:**

```bash
wrangler tail  # Check real-time logs
curl https://adocavo.net/api/health  # Check health endpoint
```

**Deployment errors:**

```bash
./scripts/validate-env.sh  # Validate configuration
wrangler whoami  # Check authentication
```

**Rollback:**

```bash
./scripts/rollback.sh production  # Interactive rollback
```

For more troubleshooting, see [docs/DEPLOYMENT.md#troubleshooting](docs/DEPLOYMENT.md#troubleshooting).

## License

MIT
