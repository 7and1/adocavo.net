# Adocavo Intelligence - MVP Architecture

**Design Philosophy: God of Simplicity**

## Executive Summary

- **Goal**: AI-powered short video ad script generation (TikTok/Reels/Shorts)
- **Strategy**: Free-to-use + credit system + waitlist
- **Timeline**: 2-3 weeks (1 developer)
- **Monthly Cost**: $5-25 (depends on AI usage)
- **Confidence**: 9/10

---

## Tech Stack (Cloudflare-Only)

| Component | Technology              | Why                               | Confidence |
| --------- | ----------------------- | --------------------------------- | ---------- |
| Frontend  | Next.js (Pages)         | Simple routing, no RSC complexity | 9/10       |
| Hosting   | Cloudflare Pages        | Zero config, auto deploy          | 10/10      |
| API       | Pages Functions         | Collocated with frontend          | 9/10       |
| Database  | D1 (SQLite)             | Serverless SQL, free tier         | 8/10       |
| AI        | Workers AI (Llama 3.1)  | Native, cheap, fast               | 8/10       |
| Auth      | Simple email codes → D1 | No external deps                  | 7/10       |
| Email     | Workers → Resend API    | Transactional only                | 8/10       |

**No**: Separate Workers, R2, KV, Queues, Analytics Engine (overkill for MVP)

---

## Folder Structure

```
adocavo.net/
├── pages/
│   ├── index.jsx                 # Landing + generator
│   ├── waitlist.jsx              # Waitlist signup
│   ├── api/
│   │   ├── generate.js           # AI script generation
│   │   ├── auth/
│   │   │   ├── send-code.js      # Email magic link
│   │   │   └── verify-code.js    # Verify + session
│   │   └── user/
│   │       └── credits.js        # Check credits
│   └── _app.jsx                  # Global layout
├── components/
│   ├── Generator.jsx             # Main form (product, tone, duration)
│   ├── ScriptOutput.jsx          # AI result display
│   └── CreditBadge.jsx           # Show remaining credits
├── lib/
│   ├── db.js                     # D1 client wrapper
│   ├── ai.js                     # Workers AI client
│   └── session.js                # Cookie-based sessions
├── schema.sql                    # D1 tables
├── wrangler.toml                 # Cloudflare config
├── next.config.js                # Next.js + CF Pages adapter
└── package.json
```

**Lines of Code Estimate**: ~800 LOC

---

## Database Schema (D1)

```sql
-- schema.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 3,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  script TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
```

**Indexes**: Add on `users.email`, `sessions.expires_at` after 100+ users

---

## Core Workflows

### 1. User Flow (No Login)

```
Landing → Enter product/tone → Generate → Output
         ↓ (if no credits)
         Waitlist signup
```

### 2. Credit System

- **New user**: 3 free credits (stored in cookie if no email)
- **Email signup**: 5 credits (persistent)
- **Rate limit**: 1 generation/10sec (prevent abuse)

### 3. AI Generation (Workers AI)

```javascript
// pages/api/generate.js
export default async function handler(req) {
  const { product, tone, duration } = req.body;

  const prompt = `Generate a ${duration}-second ${tone} TikTok ad script for: ${product}

Format:
[HOOK] (0-3s)
[BODY] (3-${duration - 5}s)
[CTA] (last 5s)`;

  const ai = new Ai(env.AI);
  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [{ role: "user", content: prompt }],
  });

  return response.response;
}
```

**Model**: Llama 3.1 8B (free tier: 10k neurons/day)
**Confidence**: 8/10 (may need prompt tuning)

---

## Pages Functions Integration

```javascript
// next.config.js
module.exports = {
  experimental: {
    runtime: "experimental-edge", // Optional: make all API routes edge
  },
};
```

```toml
# wrangler.toml
name = "adocavo-net"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "adocavo"
database_id = "xxx" # from `wrangler d1 create adocavo`

[ai]
binding = "AI"
```

**Deployment**: `npx wrangler pages deploy`

---

## Authentication (Simple)

**No passwords, no OAuth, no JWT libraries**

```javascript
// pages/api/auth/send-code.js
export default async function handler(req, { env }) {
  const { email } = req.body;
  const code = Math.random().toString(36).slice(2, 8);

  // Store code (expires in 10 min)
  await env.DB.prepare("INSERT INTO sessions VALUES (?, NULL, ?)")
    .bind(code, Date.now() + 600000)
    .run();

  // Send email (Resend API)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_KEY}` },
    body: JSON.stringify({
      from: "noreply@adocavo.net",
      to: email,
      subject: "Your Adocavo code",
      html: `Code: <b>${code}</b> (expires in 10 min)`,
    }),
  });
}
```

**Session**: HTTP-only cookie with token (30 day expiry)
**Confidence**: 7/10 (good for MVP, add proper auth later)

---

## Cost Breakdown (Monthly)

| Service         | Free Tier             | Estimated Cost     |
| --------------- | --------------------- | ------------------ |
| Pages           | Unlimited requests    | $0                 |
| Pages Functions | 100k req/day          | $0 (under limit)   |
| D1              | 5GB storage, 5M reads | $0 (MVP traffic)   |
| Workers AI      | 10k neurons/day       | $0-$5 (if exceed)  |
| Resend          | 100 emails/day        | $0 (waitlist only) |
| Domain          | N/A                   | $10/year           |

**Total**: $5-25/month (mostly AI overages)
**Confidence**: 9/10

---

## MVP Feature Set

### Phase 1 (Week 1)

- [ ] Landing page + generator form
- [ ] D1 setup + migrations
- [ ] Workers AI integration
- [ ] Basic output display
- [ ] Cookie-based credits

### Phase 2 (Week 2)

- [ ] Email auth (magic codes)
- [ ] Persistent user credits
- [ ] Waitlist page
- [ ] Rate limiting (10s cooldown)
- [ ] Copy to clipboard

### Phase 3 (Week 3)

- [ ] Generation history (last 5)
- [ ] Polish UI/UX
- [ ] Analytics (Cloudflare Web Analytics - free)
- [ ] Deploy + DNS

**Timeline**: 2-3 weeks (1 developer, 6h/day)
**Confidence**: 8/10

---

## What We're NOT Building (MVP)

- Video rendering (scripts only)
- Payment processing (waitlist gate)
- Team/collaboration
- API access
- Advanced analytics
- Export formats (plain text only)
- Social media integrations

---

## Risks & Mitigations

| Risk             | Probability | Mitigation                             | Confidence |
| ---------------- | ----------- | -------------------------------------- | ---------- |
| AI quality poor  | Medium      | Prompt engineering + fallback to GPT-4 | 7/10       |
| D1 limits hit    | Low         | Move to Neon Postgres ($20/mo)         | 9/10       |
| Abuse/spam       | Medium      | Email verification + rate limits       | 8/10       |
| Slow cold starts | Low         | Pages Functions are warm               | 9/10       |

---

## Post-MVP Enhancements (Not Now)

1. **Payments**: Stripe + Workers → buy credits ($10 = 50 credits)
2. **Better AI**: Switch to Claude 3.5 Haiku (via Workers AI)
3. **Templates**: Pre-built structures (comparison, testimonial, etc)
4. **A/B testing**: Generate 2 variants
5. **Export**: PDF, Google Docs

---

## Decision Log

| Decision        | Alternative      | Why Simpler Wins     | Confidence |
| --------------- | ---------------- | -------------------- | ---------- |
| Pages Functions | Separate Workers | No routing needed    | 9/10       |
| D1              | Neon/Supabase    | Native to CF         | 8/10       |
| Email codes     | OAuth            | No 3rd party         | 7/10       |
| Cookie credits  | LocalStorage     | Works for anon users | 8/10       |
| Llama 3.1       | GPT-4 API        | Free tier            | 8/10       |
| Next.js Pages   | App Router       | Simpler mental model | 9/10       |

---

## Success Metrics (MVP)

- 100 waitlist signups (week 1)
- 1000 scripts generated (month 1)
- 50% user return rate (generate >1 script)
- <200ms p95 latency (AI generation)

---

## Why This Will Work

1. **One Platform**: Everything on Cloudflare (no context switching)
2. **No DevOps**: Push to main = deploy
3. **Free Hosting**: $0 until 10k users
4. **Boring Tech**: Next.js, SQLite, REST (junior-friendly)
5. **Escape Hatches**: Can migrate D1 → Postgres, AI → OpenAI in <1 day

**Overall Confidence**: 9/10

---

## Next Steps

1. Run: `npm create next-app@latest . -- --app`
2. Install: `wrangler`, `@opennextjs/cloudflare`
3. Create D1: `wrangler d1 create adocavo`
4. Apply schema: `wrangler d1 execute adocavo --file=schema.sql`
5. Code the 4 core pages (index, waitlist, generate API, auth API)
6. Deploy: `opennextjs-cloudflare deploy`

**Time to First Deploy**: 4 hours
