# Deployment Quick Reference

## Essential Commands

```bash
# Build & Deploy
npm run build
npm run build:open-next
npm run deploy                    # Deploy to production
npm run deploy:preview            # Deploy to preview

# Database
npm run db:migrate                # Apply migrations to production
npx wrangler d1 migrations apply adocavo-db --remote
npx wrangler d1 export adocavo-db --remote --output=backup.sql

# Health & Monitoring
curl https://adocavo.net/api/health
npm run monitor:deployment production 5
npm run notify:deployment success production $WEBHOOK_URL

# Rollback
npm run rollback production
./scripts/rollback.sh production

# Logs
npx wrangler tail --name=adocavo-net
npx wrangler tail --name=adocavo-preview

# Validation
npm run validate:env
npm run setup:secrets
```

## CI/CD Pipeline

### Production (push to main)

1. Validate secrets
2. Pre-deployment checks (typecheck, lint, test, build)
3. Backup database
4. Run migrations
5. Verify migrations
6. Deploy to Workers
7. Health check (15 attempts)
8. Smoke tests
9. Notify & monitor

### Preview (pull request)

1. Validate secrets
2. Pre-deployment checks
3. Run migrations (preview db)
4. Verify migrations
5. Deploy to preview
6. Health check (10 attempts)
7. Rollback on failure

## Required Secrets

Set via `wrangler secret put <NAME>`:

- `NEXTAUTH_SECRET` (32+ chars)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## Cloudflare Resources

**KV Namespaces:**

- NEXT_INC_CACHE_KV
- NEXT_TAG_CACHE_KV
- CACHE_KV

**D1 Databases:**

- adocavo-db (production)
- adocavo-db-preview (preview)
- adocavo-db-dev (development)

**R2 Buckets:**

- adocavo-backups (production)
- adocavo-backups-preview (preview)

## Health Check Response

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy", "latency": 12 },
    "ai": { "status": "healthy", "latency": 33 }
  }
}
```

## Rollback Procedures

### Automated

Triggered automatically on:

- Health check failure
- Migration failure
- Smoke test failure

### Manual

```bash
# Interactive rollback
npm run rollback production

# Git-based rollback
git checkout <previous-sha>
npm run build && npm run build:open-next && npm run deploy
```

## URLs

- **Production:** https://adocavo.net
- **Preview:** https://preview.adocavo.net
- **Health:** https://adocavo.net/api/health
- **Dashboard:** https://dash.cloudflare.com

## Documentation

- `docs/CICD_SUMMARY.md` - Complete CI/CD summary
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/HEALTH_CHECK.md` - Health check guide
- `wrangler.toml.example` - Configuration reference
- `.env.example` - Environment variables

## Troubleshooting

**Migration fails:**

```bash
wrangler d1 migrations list adocavo-db --remote
wrangler d1 execute adocavo-db --remote --command "SELECT 1"
```

**Health check fails:**

```bash
curl https://adocavo.net/api/health | jq .
npx wrangler tail --name=adocavo-net
```

**Deployment timeout:**

```bash
du -sh .next  # Check build size (max 50MB)
npx wrangler validate
```

**OAuth issues:**

```bash
wrangler secret list | grep NEXTAUTH
# Verify redirect URIs in OAuth provider settings
```

---

**For complete details, see:**

- `/Volumes/SSD/dev/cloudflare/adocavo.net/docs/CICD_SUMMARY.md`
- `/Volumes/SSD/dev/cloudflare/adocavo.net/docs/DEPLOYMENT.md`
