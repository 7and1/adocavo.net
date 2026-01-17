# Adocavo Deployment Guide

Complete guide for deploying Adocavo to Cloudflare Workers with production-grade safety, monitoring, and rollback procedures.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Secrets Management](#secrets-management)
6. [Deployment Process](#deployment-process)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Rollback Procedures](#rollback-procedures)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts & Tools

- [Cloudflare Account](https://dash.cloudflare.com/sign-up) (Free tier works)
- [GitHub Account](https://github.com/signup) (for OAuth & CI/CD)
- [Google Cloud Account](https://console.cloud.google.com) (for Google OAuth)
- Node.js 20+ (`node --version`)
- npm (`npm --version`)
- Wrangler CLI (`npx wrangler --version`)

### Install Wrangler CLI

```bash
npm install -g wrangler

# Authenticate
wrangler login
```

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/adocavo.net.git
cd adocavo.net
npm install
```

### 2. Configure wrangler.toml

Copy the example and fill in your values:

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` and replace all `REPLACE_WITH_*` placeholders with your actual Cloudflare resource IDs.

### 3. Create Cloudflare Resources

#### Create KV Namespaces

```bash
# Production cache namespaces
wrangler kv namespace create NEXT_INC_CACHE_KV
wrangler kv namespace create NEXT_INC_CACHE_KV --preview
wrangler kv namespace create NEXT_TAG_CACHE_KV
wrangler kv namespace create NEXT_TAG_CACHE_KV --preview

# Note the IDs returned and add them to wrangler.toml
```

#### Create D1 Databases

```bash
# Production database
wrangler d1 create adocavo-db

# Preview database (for PR deployments)
wrangler d1 create adocavo-db-preview

# Development database (optional, for local testing)
wrangler d1 create adocavo-db-dev

# Note the database IDs and add them to wrangler.toml
```

## Environment Configuration

### Local Development

```bash
cp .env.example .env.local

# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Edit .env.local with your values
```

### Production Secrets

Use the interactive setup script:

```bash
chmod +x scripts/setup-secrets.sh
./scripts/setup-secrets.sh production

# For preview environment
./scripts/setup-secrets.sh preview
```

**Required Secrets:**

- `NEXTAUTH_SECRET`: 32+ character random string
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `GITHUB_CLIENT_ID`: From GitHub Developer Settings
- `GITHUB_CLIENT_SECRET`: From GitHub Developer Settings

## Database Setup

### Run Migrations

```bash
# Production
wrangler d1 migrations apply adocavo-db --remote

# Preview
wrangler d1 migrations apply adocavo-db-preview --remote --env preview

# Development
wrangler d1 migrations apply adocavo-db-dev --remote --env development
```

### Seed Data

```bash
# Seed hooks data
npm run seed:hooks

# Import review queue
npm run seed:review-queue

# Generate niche examples
npm run seed:niche-examples
```

### Database Backups

Automated backups are handled by the backup worker (`workers/backup/worker.ts`).

**Manual backup:**

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
wrangler d1 export adocavo-db --remote --output=backup-$TIMESTAMP.sql
```

**Restore from backup:**

```bash
wrangler d1 execute adocavo-db --remote --file=backup-YYYYMMDD_HHMMSS.sql
```

## Secrets Management

### Generate Secure Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# Or use a more secure method
openssl rand -base64 48
```

### Verify Secrets

```bash
# List all secrets
wrangler secret list

# List preview secrets
wrangler secret list --env preview
```

### Best Practices

1. **Never commit secrets to git** - Already enforced in `.gitignore`
2. **Use unique secrets per environment** - Production, preview, and development should have different secrets
3. **Rotate secrets regularly** - Every 90 days for production
4. **Use password manager** - Store secrets in 1Password, LastPass, or equivalent
5. **Monitor for leaks** - Use GitHub secret scanning

## Deployment Process

### Using the Enhanced Deploy Script

The recommended way to deploy is using the enhanced `deploy.sh` script which includes:

- Pre-deployment validation and testing
- Automated database backups
- Health checks with retries
- Automatic rollback on failure
- Deployment logging
- Post-deployment monitoring

```bash
# Deploy to production (default)
./scripts/deploy.sh

# Deploy to preview
./scripts/deploy.sh preview

# Deploy with options
./scripts/deploy.sh production --verbose
./scripts/deploy.sh preview --skip-tests --no-monitor
./scripts/deploy.sh production --dry-run
```

**Deploy Script Options:**

| Option          | Description                                             |
| --------------- | ------------------------------------------------------- |
| `--skip-tests`  | Skip pre-deployment tests (lint, typecheck, unit tests) |
| `--skip-backup` | Skip database backup                                    |
| `--no-monitor`  | Skip post-deployment monitoring                         |
| `--verbose`     | Enable verbose output                                   |
| `--dry-run`     | Simulate deployment without actual changes              |

**Deployment Flow:**

1. **Prerequisites Check** - Validates Node.js, npm, Wrangler, git status
2. **Environment Validation** - Runs `validate-env.sh` to check configuration
3. **Pre-deployment Tests** - TypeScript type check, lint, unit tests
4. **Clean Build** - Removes `.next` and `.open-next` directories
5. **Build Application** - Runs Next.js and OpenNext builds
6. **Database Backup** - Creates timestamped backup
7. **Run Migrations** - Applies D1 migrations
8. **Deploy** - Deploys to Cloudflare Workers
9. **Health Check** - Waits for propagation, checks health endpoint (15 retries)
10. **Smoke Tests** - Tests key endpoints
11. **Post-deployment Monitoring** - Monitors for 2 minutes
12. **Generate Report** - Creates deployment report

**Deployment Logs:**

All deployments are logged to `logs/deployments/`:

- `deployment-{ENVIRONMENT}-{TIMESTAMP}.log` - Detailed deployment log
- `report-{ENVIRONMENT}-{TIMESTAMP}.txt` - Deployment summary report
- `backup-{DB_NAME}-{TIMESTAMP}.sql` - Database backup (if created)

### Manual Deployment

#### Production

```bash
# Build the application
npm run build
npm run build:open-next

# Deploy to Cloudflare Workers
npm run deploy

# Or use wrangler directly
wrangler deploy
```

#### Preview Environment

```bash
npm run deploy:preview
```

### Automated Deployment (CI/CD)

The project uses GitHub Actions for automated deployment:

**On push to `main`:**

- Runs all tests (lint, typecheck, unit tests)
- Validates secrets
- Builds application
- Runs database migrations (with backup)
- Deploys to production
- Runs health checks
- Performs smoke tests

**On pull request:**

- Deploys to preview environment
- Runs health checks on preview URL
- Comments preview URL on PR

### Deployment Verification

After deployment, verify:

```bash
# Health check
curl https://adocavo.net/api/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-12T10:00:00.000Z",
  "runtime": "edge",
  "latency": 123,
  "checks": {
    "database": { "status": "healthy", "latency": 45 },
    "ai": { "status": "healthy", "latency": 78 }
  }
}
```

## Monitoring & Health Checks

### Health Check Endpoint

`/api/health` provides:

- Overall service status
- Database connectivity check
- Workers AI availability check
- Response latency metrics

### Monitoring Tools

#### Real-time Logs

```bash
# Tail production logs
wrangler tail

# Tail preview logs
wrangler tail --env preview

# Filter logs
wrangler tail --format pretty
```

#### External Monitoring (Optional)

Configure log drain in `wrangler.toml`:

```toml
[vars]
LOG_DRAIN_PROVIDER = "datadog"  # or "axiom", "betterstack"
```

Set log drain secret:

```bash
wrangler secret put LOG_DRAIN_TOKEN
```

### Key Metrics to Monitor

1. **Response time**: Health endpoint latency
2. **Error rate**: Failed requests in logs
3. **Database performance**: D1 query latency
4. **AI availability**: Workers AI response time
5. **Rate limits**: 429 responses from APIs

### Alerts

Set up Cloudflare Email Alerts (recommended):

- Worker errors
- High response time (>5s)
- Rate limit exceeded
- Deployment failures

## Rollback Procedures

### Automatic Rollback

The CI/CD pipeline includes automatic rollback on critical failures:

- Health check failures
- Smoke test failures
- Migration errors

### Manual Rollback

Use the rollback script:

```bash
chmod +x scripts/rollback.sh

# Rollback production
./scripts/rollback.sh production

# Rollback preview
./scripts/rollback.sh preview
```

### Rollback via Git

```bash
# View recent deployments
git log --oneline -10

# Checkout previous commit
git checkout <previous-commit-sha>

# Rebuild and redeploy
npm run build
npm run build:open-next
wrangler deploy

# Verify health
curl https://adocavo.net/api/health
```

### Database Rollback

**⚠️ WARNING: Database rollback destroys data since the migration. Only use in emergencies.**

```bash
# Export current state first
wrangler d1 export adocavo-db --remote --output=emergency-backup.sql

# Restore from backup
wrangler d1 execute adocavo-db --remote --file=backup-YYYYMMDD_HHMMSS.sql
```

### Rollback Verification

After rollback:

1. Check health endpoint
2. Run smoke tests
3. Monitor logs for errors
4. Verify key user journeys
5. Check analytics for errors

## CI/CD Pipeline

### Workflow Files

- `.github/workflows/deploy.yml` - Main deployment workflow
- `.github/workflows/ci.yml` - Continuous integration (tests, lint)
- `.github/workflows/performance.yml` - Performance monitoring

### Deployment Stages

**1. Validate Secrets**

- Checks all required secrets are set
- Fails early if secrets missing

**2. Pre-deployment Checks**

- TypeScript compilation
- Lint validation
- Unit tests
- Build verification
- Bundle size validation

**3. Database Migration**

- Creates backup before migration
- Applies migrations with `--yes` flag
- Verifies migration success

**4. Deployment**

- Builds OpenNext worker bundle
- Deploys to Cloudflare Workers
- Creates deployment artifact

**5. Post-deployment Verification**

- Health check (retries 15x with 15s intervals)
- Smoke tests on key endpoints
- Deployment metrics to GitHub summary

**6. Rollback on Failure**

- Automatic rollback on critical failures
- Manual intervention instructions
- Database restore capabilities

### Environment-Specific Deployments

| Environment | Trigger        | URL                         | Database           |
| ----------- | -------------- | --------------------------- | ------------------ |
| Production  | Push to `main` | https://adocavo.net         | adocavo-db         |
| Preview     | Pull request   | https://preview.adocavo.net | adocavo-db-preview |
| Development | Manual         | https://dev.adocavo.net     | adocavo-db-dev     |

## Troubleshooting

### Common Issues

#### 1. Migration Failures

**Symptom:** Migrations fail or timeout

**Solution:**

```bash
# Check migration status
wrangler d1 migrations list adocavo-db --remote

# Verify database exists
wrangler d1 list

# Try re-running with verbose output
wrangler d1 migrations apply adocavo-db --remote --verbose
```

#### 2. Health Check Failures

**Symptom:** Health endpoint returns 500 or times out

**Solution:**

```bash
# Check real-time logs
wrangler tail

# Verify bindings
wrangler tail | grep "binding"

# Test database directly
wrangler d1 execute adocavo-db --remote --command "SELECT 1"

# Test AI binding
wrangler ai run @cf/meta/llama-3-8b-instruct "ping"
```

#### 3. Deployment Errors

**Symptom:** Deployment fails with binding error

**Solution:**

```bash
# Verify wrangler.toml configuration
cat wrangler.toml | grep binding

# Check resources exist
wrangler kv:namespace list
wrangler d1 list

# Verify account ID
wrangler whoami
```

#### 4. OAuth Authentication Issues

**Symptom:** Login redirects fail or return errors

**Solution:**

```bash
# Verify NEXTAUTH_URL matches domain
wrangler secret list | grep NEXTAUTH

# Check OAuth callback URLs
# Google Cloud Console: https://adocavo.net/api/auth/callback/google
# GitHub OAuth App: https://adocavo.net/api/auth/callback/github

# Verify secrets are set
wrangler secret get NEXTAUTH_SECRET
wrangler secret get GOOGLE_CLIENT_ID
wrangler secret get GOOGLE_CLIENT_SECRET
```

#### 5. Rate Limiting Issues

**Symptom:** 429 responses from APIs

**Solution:**

```bash
# Check current rate limits in code
cat src/lib/rate-limit.ts

# Adjust in wrangler.toml [vars]
# RATE_LIMIT_GENERATE_REQUESTS=20
# RATE_LIMIT_GENERATE_WINDOW=60

# Redeploy after changes
wrangler deploy
```

### Emergency Procedures

#### Site Completely Down

1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Check worker logs: `wrangler tail`
3. Check health endpoint manually
4. Initiate rollback if needed
5. Check incident response plan

#### Data Loss

1. STOP all deployments immediately
2. Export current database state
3. Identify most recent good backup
4. Restore from backup
5. Verify data integrity
6. Investigate root cause
7. Document incident

#### Security Incident

1. Rotate all secrets immediately
2. Review access logs
3. Check for unauthorized changes
4. Enable additional monitoring
5. Document incident timeline
6. Notify stakeholders if needed

### Getting Help

- **Logs:** `wrangler tail`
- **Health:** `curl https://adocavo.net/api/health`
- **Docs:** See `/docs/` directory
- **Issues:** GitHub Issues

## Best Practices

### Before Deployment

1. Run tests locally: `npm test`
2. Build locally: `npm run build`
3. Check bundle size
4. Review migration files
5. Test in preview environment first

### During Deployment

1. Monitor real-time logs: `wrangler tail`
2. Watch health endpoint
3. Have rollback plan ready
4. Keep stakeholders informed

### After Deployment

1. Verify health check passes
2. Test key user journeys
3. Monitor logs for 15 minutes
4. Check analytics for errors
5. Document any issues

### Regular Maintenance

- Weekly: Review logs for errors
- Monthly: Rotate secrets
- Quarterly: Review and update dependencies
- Annually: Security audit

## Appendix

### Useful Commands

```bash
# Deployment
npm run deploy              # Deploy production
npm run deploy:preview      # Deploy preview
wrangler deploy             # Deploy current config

# Database
npm run db:migrate          # Run migrations
npm run db:generate         # Generate migration from schema
wrangler d1 list            # List all databases

# Secrets
wrangler secret list        # List secrets
wrangler secret put NAME    # Set secret
./scripts/setup-secrets.sh  # Interactive setup

# Logs & Monitoring
wrangler tail               # Real-time logs
wrangler deployments list   # Deployment history
curl /api/health            # Health check

# Rollback
./scripts/rollback.sh       # Interactive rollback
git checkout <sha>          # Checkout previous version
```

### Environment Variables Reference

See `.env.example` for complete list of environment variables.

### Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Next.js Docs](https://nextjs.org/docs)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)

---

**Last Updated:** 2025-01-12
**Maintained By:** Adocavo Team
