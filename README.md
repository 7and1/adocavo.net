# Adocavo Intelligence

AI-powered short video ad script generator for TikTok/Reels/Shorts.

## Stack

- Next.js 15 (App Router)
- Cloudflare Workers + D1 + Workers AI
- Auth.js v5 + Drizzle ORM
- Tailwind CSS + shadcn/ui

## Quick Start

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local

# Create D1 database (copy database_id into wrangler.toml)
wrangler d1 create adocavo-db

# Run schema migration (remote)
npm run db:migrate

# Seed hooks
npm run seed:hooks

# Start dev server (Next.js)
npm run dev
```

## Local Development Notes

- `npm run dev` runs Next.js locally. Use `npm run preview` to validate the Workers runtime output.
- Set secrets in Cloudflare dashboard for production: `NEXTAUTH_SECRET`, OAuth provider keys, etc.

## Key Scripts

```bash
npm run build
npm run build:open-next
npm run preview
npm run deploy
npm run db:migrate
npm run seed:hooks
npm run test
```

## Architecture

See `ARCHITECTURE.md` and `/docs/BLUEPRINT.md` for full technical details.
