# Adocavo Troubleshooting Guide

This guide provides solutions to common issues encountered during development, deployment, and operation of Adocavo.

## Table of Contents

1. [Development Issues](#development-issues)
2. [Build Issues](#build-issues)
3. [Deployment Issues](#deployment-issues)
4. [Database Issues](#database-issues)
5. [Authentication Issues](#authentication-issues)
6. [Performance Issues](#performance-issues)
7. [API Issues](#api-issues)
8. [Product URL Analysis Issues](#product-url-analysis-issues)
9. [Export Functionality Issues](#export-functionality-issues)
10. [Blog System Issues](#blog-system-issues)
11. [Monitoring & Debugging](#monitoring--debugging)

---

## Development Issues

### npm run dev fails to start

**Symptoms:**

- Error: `Cannot find module 'next'`
- Error: `ENOENT: no such file or directory`
- Port 3000 already in use

**Solutions:**

```bash
# Install dependencies
npm install

# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install

# Kill process on port 3000
# macOS
lsof -ti:3000 | xargs kill -9

# Linux
fuser -k 3000/tcp

# Use different port
PORT=3001 npm run dev
```

### TypeScript errors in VS Code

**Symptoms:**

- Red squiggly lines in `.ts` and `.tsx` files
- "Cannot find module" errors
- Type errors that don't appear in terminal

**Solutions:**

```bash
# Restart TypeScript server in VS Code
# Command Palette (Cmd+Shift+P) -> "TypeScript: Restart TS Server"

# Verify TypeScript version
npm ls typescript

# Reinstall types
npm install --save-dev @types/node @types/react @types/react-dom
```

### Environment variables not working

**Symptoms:**

- `process.env.VARIABLE` returns `undefined`
- `.env.local` changes not reflecting

**Solutions:**

```bash
# Verify .env.local exists
ls -la .env*

# Check for syntax errors (no spaces around =)
cat .env.local

# Restart dev server after changes
# Environment variables are only loaded at startup

# For production, verify wrangler.toml [vars] section
cat wrangler.toml | grep -A 10 "\[vars\]"
```

---

## Build Issues

### npm run build fails

**Symptoms:**

- `Module not found: Can't resolve '@/components/...'`
- `TypeScript error: ...`
- Build hangs or runs out of memory

**Solutions:**

```bash
# Clear all build artifacts
rm -rf .next .open-next node_modules/.cache

# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Run typecheck separately to see all errors
npm run typecheck

# Run with verbose output
npm run build -- --debug
```

### OpenNext build fails

**Symptoms:**

- Error: `Cannot find worker.js`
- Error: `Assets directory not found`
- Build completes but worker is missing

**Solutions:**

```bash
# Ensure Next.js build completed first
ls -la .next

# Clear OpenNext cache and rebuild
rm -rf .open-next
npm run build:open-next

# Verify wrangler.toml configuration
cat wrangler.toml | grep -A 3 "\[assets\]"

# Check for large assets (>25MB limit)
du -sh .next/static
find .next/static -size +25M -exec ls -lh {} \;
```

### Bundle size exceeds limit

**Symptoms:**

- Error: `Bundle size exceeds 50MB limit`
- Deployment fails after build succeeds

**Solutions:**

```bash
# Analyze bundle size
npm run build

# Check largest files
du -sh .next/**/* | sort -hr | head -20

# Check static assets
du -sh public/* 2>/dev/null | sort -hr

# Solutions:
# 1. Move large assets to R2
# 2. Optimize images (use webp, reduce quality)
# 3. Remove unused dependencies
# 4. Use dynamic imports for large components
```

---

## Deployment Issues

### wrangler deploy fails

**Symptoms:**

- Error: `Authentication error`
- Error: `Worker script not found`
- Error: `Bindings not found`

**Solutions:**

```bash
# Check authentication
wrangler whoami

# Re-authenticate
wrangler logout
wrangler login

# Verify wrangler.toml syntax
wrangler dev --dry-run

# Check worker name matches wrangler.toml
grep "^name = " wrangler.toml

# Deploy with verbose output
wrangler deploy --verbose
```

### Health check fails after deployment

**Symptoms:**

- Deployment succeeds but health endpoint returns 500
- Timeout errors
- "Cloudflare Context missing"

**Solutions:**

```bash
# Check real-time logs
wrangler tail

# Verify bindings in wrangler.toml
grep -A 3 "\[assets\]" wrangler.toml
grep -A 3 "\[d1_databases\]" wrangler.toml
grep -A 3 "\[ai\]" wrangler.toml

# Test health endpoint manually
curl https://adocavo.net/api/health
curl https://adocavo.net/api/health | jq .

# Verify worker is running
wrangler deployments list --name adocavo-net

# If context missing, check getCloudflareContext implementation
cat src/lib/cloudflare.ts
```

### Deployment not propagating

**Symptoms:**

- Old code still running after deployment
- Changes not visible for >5 minutes
- Different behavior across regions

**Solutions:**

```bash
# Check deployment status
wrangler deployments list --name adocavo-net

# Purge Cloudflare cache
# Go to dashboard: Caching -> Configuration -> Purge Everything

# Or use API
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Verify version
curl https://adocavo.net/api/health | jq .version
```

### Rollback needed

**Solutions:**

```bash
# Use rollback script
./scripts/rollback.sh production

# Or rollback via Git
git log --oneline -10
git checkout <previous-commit-sha>
npm run build && npm run build:open-next && wrangler deploy

# Verify health
curl https://adocavo.net/api/health
```

---

## Database Issues

### D1 Migration failures

**Symptoms:**

- Error: `Migration failed`
- Error: `Table already exists`
- Error: `Constraint violation`

**Solutions:**

```bash
# Check migration status
wrangler d1 migrations list adocavo-db --remote

# View specific migration
cat drizzle/migrations/0001_migration_name.sql

# Rollback to specific migration (manual)
wrangler d1 execute adocavo-db --remote --command "DROP TABLE IF EXISTS table_name;"

# Re-run migrations
wrangler d1 migrations apply adocavo-db --remote --force

# For schema conflicts, check existing schema
wrangler d1 execute adocavo-db --remote --command "SELECT sql FROM sqlite_master WHERE type='table';"
```

### D1 Connection issues

**Symptoms:**

- Error: `Database binding not found`
- Timeout errors
- Intermittent failures

**Solutions:**

```bash
# Verify database exists
wrangler d1 list

# Check binding in wrangler.toml
grep -A 5 "\[\[d1_databases\]\]" wrangler.toml

# Test database connectivity
wrangler d1 execute adocavo-db --remote --command "SELECT 1 as test;"

# Check for database limits
wrangler d1 info adocavo-db
```

### Data corruption

**Solutions:**

```bash
# Create emergency backup
wrangler d1 export adocavo-db --remote --output=emergency-backup-$(date +%Y%m%d_%H%M%S).sql

# Check for data issues
wrangler d1 execute adocavo-db --remote --command "SELECT COUNT(*) FROM users;"
wrangler d1 execute adocavo-db --remote --command "SELECT COUNT(*) FROM hooks;"

# Restore from backup if needed
wrangler d1 execute adocavo-db --remote --file=backup-YYYYMMDD_HHMMSS.sql
```

---

## Authentication Issues

### OAuth login fails

**Symptoms:**

- Error: `Callback URL mismatch`
- Error: `Invalid client`
- Login redirects but doesn't complete

**Solutions:**

```bash
# Verify NEXTAUTH_URL
wrangler secret list | grep NEXTAUTH_URL

# Check OAuth callback URLs in provider console:
# Google: https://console.cloud.google.com/apis/credentials
# GitHub: https://github.com/settings/developers

# Verify secrets are set
wrangler secret list | grep CLIENT

# Test callback URL manually
curl https://adocavo.net/api/auth/callback/google
```

### Session issues

**Symptoms:**

- Frequently logged out
- Session not persisting
- "Invalid session" errors

**Solutions:**

```bash
# Check NEXTAUTH_SECRET
wrangler secret get NEXTAUTH_SECRET

# Regenerate if needed (requires users to re-login)
openssl rand -base64 32 | wrangler secret put NEXTAUTH_SECRET

# Check cookie configuration in auth config
cat src/auth.ts | grep -A 5 cookies

# Verify database sessions table exists
wrangler d1 execute adocavo-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%session%';"
```

---

## Performance Issues

### Slow page loads

**Symptoms:**

- Initial load >3 seconds
- High TTFB (Time to First Byte)
- Lighthouse score <80

**Solutions:**

```bash
# Run Lighthouse audit
npm run perf:budget

# Check health endpoint latency
time curl https://adocavo.net/api/health

# Check worker cold starts
# Deploy multiple times and measure
for i in {1..5}; do time curl -s https://adocavo.net/api/health > /dev/null; done

# Enable caching in wrangler.toml
# [build]
# cwd = "."
# command = "npm run build"
# watch_dirs = ["."]
# [build.upload]
# format = "modules"
# main = ".open-next/worker.js"

# Check for large bundles
du -sh .open-next/assets
```

### High memory usage

**Symptoms:**

- Worker errors: "Exceeded CPU limit"
- Frequent restarts

**Solutions:**

```bash
# Check for memory leaks in logs
wrangler tail | grep -i memory

# Profile the application
# Add NODE_OPTIONS="--max-old-space-size=256" to wrangler.toml

# Check for large objects in state
# Review React components for:
# - Uncontrolled re-renders
# - Large state objects
# - Memory leaks in useEffect
```

### AI generation slow

**Symptoms:**

- Generation takes >30 seconds
- Timeout errors

**Solutions:**

```bash
# Check AI service status
curl https://adocavo.net/api/health | jq .checks.ai

# Test AI directly
wrangler ai run @cf/meta/llama-3-8b-instruct "test"

# Adjust model size in wrangler.toml
# AI_MODEL_SIZE = "8b"  # or "7b" for faster inference

# Check rate limits
curl https://adocavo.net/api/health | jq .checks
```

---

## API Issues

### 500 errors on API endpoints

**Symptoms:**

- Generic 500 error response
- Error logs show stack traces

**Solutions:**

```bash
# Check real-time logs
wrangler tail | grep -i error

# Test endpoint directly
curl -X POST https://adocavo.net/api/generate \
  -H "Content-Type: application/json" \
  -d '{"hookId":"test","productDescription":"test"}'

# Check for missing bindings
wrangler tail | grep -i binding

# Verify request schema
cat src/lib/validations.ts
```

### Rate limiting errors

**Symptoms:**

- 429 Too Many Requests
- "Rate limit exceeded" messages

**Solutions:**

```bash
# Check current rate limits
cat src/lib/rate-limit.ts

# Adjust limits in code or environment
# RATE_LIMIT_GENERATE_REQUESTS=20
# RATE_LIMIT_GENERATE_WINDOW=60

# Check for abuse in logs
wrangler tail | grep -i rate

# Reset rate limits (KV-based)
wrangler kv:key delete --binding=CACHE_KV "rate:generate:user_id"
```

### CORS errors

**Symptoms:**

- Browser console: "CORS policy blocked"
- Preflight OPTIONS request fails

**Solutions:**

```bash
# Check CORS configuration
# For API routes, add CORS headers:
# export const runtime = 'edge'
# headers.set('Access-Control-Allow-Origin', '*')
# headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

# Verify in API route
cat src/app/api/your-route/route.ts | grep -i cors

# Test with curl
curl -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://adocavo.net/api/endpoint
```

---

## Product URL Analysis Issues

### URL scraping fails

**Symptoms:**

- "Failed to extract product information" error
- Timeout errors
- Invalid URL response

**Solutions:**

```bash
# Check rate limits
curl https://adocavo.net/api/health | jq .checks

# Test URL manually
curl -I "https://example.com/product"

# Verify URL is accessible
# - Must be public URL (not localhost)
# - Must be HTTP/HTTPS
# - Must return 200 status

# Check for blocking
# - Some sites block automated scraping
# - Try accessing URL in browser first
```

**Common Issues:**

- Private IP addresses blocked (security feature)
- URL exceeds 500 character limit
- Site blocks scraping (403/429 errors)
- Network timeout (10 second limit)
- Site requires JavaScript

### AI analysis not showing

**Symptoms:**

- Product info extracted but no AI analysis
- Missing `aiAnalysis` field in response

**Solutions:**

```bash
# Check AI binding
wrangler secret list | grep AI

# Test Workers AI directly
wrangler ai run @cf/meta/llama-3.1-8b-instruct "test"

# Verify AI availability
curl https://adocavo.net/api/health | jq .checks.ai
```

**Note:** AI analysis is optional and gracefully degrades if unavailable.

### Platform-specific issues

**TikTok URLs:**

```bash
# Verify TikTok URL format
# Valid: https://www.tiktok.com/@user/video/123456789
# Valid: https://vm.tiktok.com/ZMxxxxxxx/
# Invalid: https://tiktok.com (no specific video)

# TikTok may require mobile user agent
# System handles this automatically
```

**Amazon URLs:**

```bash
# Amazon frequently changes HTML structure
# If scraping fails:
# 1. Check if URL is accessible in browser
# 2. Verify product is available (not out of stock)
# 3. Try generic scraping fallback (Open Graph tags)
```

**Shopify URLs:**

```bash
# Shopify stores vary in structure
# System tries multiple extraction methods:
# 1. JSON-LD structured data
# 2. Open Graph tags
# 3. Meta tags
# 4. HTML title/description

# If all fail, check page source for:
# <script type="application/ld+json">
# <meta property="og:title">
```

---

## Export Functionality Issues

### PDF export fails

**Symptoms:**

- PDF download doesn't start
- "PDF generation failed" error
- Empty or corrupted PDF

**Solutions:**

```bash
# Check browser console for errors
# Open Developer Tools (F12) -> Console

# Verify jsPDF is loaded
# In browser console:
typeof jspdf
# Should return: "object"

# Check for large content
# PDF generation may fail with very large scripts
# Try exporting as TXT or JSON instead
```

**Browser Compatibility:**

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

### Clipboard copy fails

**Symptoms:**

- Copy button doesn't copy text
- "Failed to copy" error
- No visual feedback

**Solutions:**

```bash
# Check clipboard permissions
# Browser may prompt for permission
# Allow clipboard access for the site

# Verify Clipboard API support
# In browser console:
!!navigator.clipboard
# Should return: true

# Manual fallback:
# 1. Select text manually
# 2. Ctrl/Cmd + C to copy
```

### Email export not working

**Symptoms:**

- Email client doesn't open
- Mailto link does nothing

**Solutions:**

```bash
# Check default email client is set
# macOS: Mail.app or other
# Windows: Outlook, Thunderbird, etc.
# Linux: Depends on desktop environment

# Test mailto link manually
# In browser address bar:
mailto:test@example.com?subject=Test

# Browser may block mailto links
# Check browser settings -> Applications -> mailto
```

### Export formats not showing

**Symptoms:**

- Export dropdown missing options
- Only some formats available

**Solutions:**

```bash
# Check browser console for errors
# Look for module import errors

# Clear browser cache
# Chrome: Ctrl+Shift+Delete -> Cached images and files
# Firefox: Ctrl+Shift+Delete -> Cache
# Safari: Cmd+Option+E

# Try hard refresh
# Chrome: Ctrl+Shift+R
# Firefox: Ctrl+F5
# Safari: Cmd+Option+R
```

---

## Blog System Issues

### Blog posts not loading

**Symptoms:**

- Blog page shows loading spinner indefinitely
- "Failed to load blog content" error
- Empty blog list

**Solutions:**

```bash
# Check blog content files exist
ls -la public/content/blog/

# Verify index.json
cat public/content/blog/index.json

# Check file permissions
# Files should be readable (644)
chmod 644 public/content/blog/*.json

# Test JSON validity
jq '.' public/content/blog/index.json
```

### Blog content extraction fails

**Symptoms:**

- `npm run extract:blog` fails
- Missing JSON files after extraction
- Invalid JSON files

**Solutions:**

```bash
# Re-run extraction with verbose output
npm run extract:blog

# Check source files exist
ls -la src/data/blog-posts.ts
ls -la src/data/category-deep-dives.ts
ls -la src/lib/additional-blog-posts.ts

# Verify TypeScript compiles
npm run typecheck

# Manual extraction check
node scripts/extract-blog-content.ts
```

### Blog performance issues

**Symptoms:**

- Slow blog page loads
- Large bundle size
- Low Lighthouse scores

**Solutions:**

```bash
# Check bundle size
npm run build
# Look for blog content in build output

# Verify JSON files are being used (not embedded)
# Build output should show:
# - Dynamic imports for blog posts
# - External JSON files in public/content/blog/

# Run Lighthouse audit
npm run perf:budget

# Check CDN caching
curl -I https://adocavo.net/content/blog/index.json
# Should show: Cache-Control: public, max-age=3600
```

### Blog metadata issues

**Symptoms:**

- Missing posts in blog list
- Incorrect slugs
- Broken blog links

**Solutions:**

```bash
# Regenerate blog metadata
npm run create:blog-metadata

# Check generated metadata
cat src/data/blog-metadata.ts

# Verify slug format
# Slugs should be:
# - lowercase
# - hyphen-separated
# - URL-safe characters only

# Test blog routing
curl https://adocavo.net/blog/tiktok-ad-script-guide
```

---

## Monitoring & Debugging

### Enable verbose logging

```bash
# Add to wrangler.toml
[vars]
LOG_LEVEL = "debug"

# Or export environment variable
export LOG_LEVEL=debug

# Check logs in real-time
wrangler tail --format pretty
```

### Structured error logs

```bash
# Filter by error level
wrangler tail | grep -i error

# Filter by specific endpoint
wrangler tail | grep "/api/generate"

# Save logs to file
wrangler tail > logs/worker-$(date +%Y%m%d_%H%M%S).log
```

### Debugging with breakpoints

```typescript
// Add debug logging
console.log("[DEBUG]", { key: "value" });

// Use structured logging for easier parsing
console.log(
  JSON.stringify({
    level: "debug",
    timestamp: new Date().toISOString(),
    context: { key: "value" },
  }),
);
```

### Health check monitoring

```bash
# Continuous health monitoring
watch -n 5 'curl -s https://adocavo.net/api/health | jq .'

# Alert on failure
while true; do
  curl -s https://adocavo.net/api/health | jq -e '.status == "healthy"' || \
    (echo "ALERT: Health check failed!" | say; break)
  sleep 30
done
```

---

## Emergency Procedures

### Site completely down

1. Check Cloudflare status: https://www.cloudflarestatus.com/
2. Check worker logs: `wrangler tail`
3. Verify worker exists: `wrangler deployments list`
4. Check health endpoint manually
5. Initiate rollback if needed: `./scripts/rollback.sh production`

### Data corruption

1. STOP all deployments
2. Export current state: `wrangler d1 export adocavo-db --remote --output=emergency.sql`
3. Identify last good backup
4. Restore: `wrangler d1 execute adocavo-db --remote --file=backup.sql`
5. Verify data integrity
6. Document incident

### Security incident

1. Rotate all secrets: `./scripts/setup-secrets.sh production`
2. Review access logs: `wrangler tail --format pretty`
3. Check for unauthorized changes
4. Enable additional monitoring
5. Document timeline

---

## Getting Additional Help

### Resources

- **Documentation:** `/docs/` directory
- **API Reference:** `/docs/API.md`
- **Deployment Guide:** `/docs/DEPLOYMENT.md`
- **Architecture:** `/docs/TECHNICAL_ARCHITECTURE.md`

### Commands Reference

```bash
# Quick health check
curl https://adocavo.net/api/health

# View logs
wrangler tail

# Deploy
./scripts/deploy.sh production

# Rollback
./scripts/rollback.sh production

# Validate environment
./scripts/validate-env.sh

# Monitor deployment
./scripts/monitor-deployment.sh production
```

### Contact

- Create GitHub issue for bugs
- Check existing issues first
- Include logs and error messages
- Specify environment (prod/preview/dev)

---

**Last Updated:** 2025-01-16
**Maintained By:** Adocavo Team
