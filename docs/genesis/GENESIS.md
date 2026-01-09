# Adocavo Intelligence - GENESIS Architecture

## 1. Executive Summary

Adocavo Intelligence is a Cloudflare-native TikTok ad script generation platform combining curated viral "hooks" with AI-powered remixing. We're building a hook library browser (React) + script generator (Workers AI) + credit system (D1) that runs entirely on Cloudflare's edge network. Target: 100 WAU in 8 weeks via free-to-paid-waitlist strategy. This document synthesizes performance, robustness, and simplicity considerations into an MVP-optimized stack.

## 2. Recommended Stack

| Layer                  | Choice                       | Philosophy  | Why                                                                                              |
| ---------------------- | ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| **Frontend Framework** | Next.js 14 (App Router)      | Simplicity  | React Server Components reduce client JS; Cloudflare Pages adapter available; team familiarity   |
| **Hosting**            | Cloudflare Pages             | All three   | Zero-config CDN, free tier sufficient, same ecosystem as Workers                                 |
| **Backend**            | Cloudflare Workers           | Performance | Edge execution (<50ms cold start); natively integrates with D1/AI; no container overhead         |
| **Database**           | Cloudflare D1                | Simplicity  | Managed SQLite, no connection pooling needed, sufficient for 10K users; automatic backups        |
| **AI Inference**       | Workers AI (Llama 3 8B)      | Simplicity  | Free tier: 10K req/day, <5s latency; upgrade path to OpenRouter if quality insufficient          |
| **Authentication**     | NextAuth.js v5 + D1          | Robustness  | Industry standard, OAuth providers (Google/GitHub), custom D1 adapter (see implementation notes) |
| **Caching**            | Workers Cache API            | Performance | Edge-cached hook library (24hr TTL), user credits cached (5min TTL) for read-heavy patterns      |
| **Observability**      | Cloudflare Workers Analytics | Simplicity  | Built-in, no third-party setup; sufficient for MVP (upgrade to Sentry in Phase 2)                |

## 3. Trade-offs Accepted

### Performance vs. Simplicity

- **Rejected**: Custom Workers-only auth (10x faster) → **Chose**: NextAuth.js (maintainable)
- **Rationale**: MVP speed-to-market > 200ms auth latency optimization

### Robustness vs. Simplicity

- **Rejected**: Distributed transactions for credit system → **Chose**: Optimistic locking with retry
- **Rationale**: Race conditions affect <0.1% of requests; retry logic is 50 lines vs. 500 for 2PC

### Simplicity vs. Feature Completeness

- **Rejected**: Real-time AI streaming → **Chose**: Single-shot generation
- **Rationale**: 15s total wait acceptable for MVP; streaming adds 3-4 hours complexity

### Cost vs. Quality

- **Accepted**: Workers AI quality ceiling (Llama 3 8B < GPT-4)
- **Mitigation**: Extensive prompt engineering (see `src/lib/prompts.ts`); OpenRouter fallback in Phase 2

## 4. Phase 1 Action Plan (MVP)

### Step 1: Infrastructure Setup

1. Create Cloudflare account, purchase domain `adocavo.net`
2. Initialize Next.js project: `npx create-next-app@latest --app`
3. Install dependencies: `next-auth`, `@cloudflare/workers-types`, `drizzle-orm`
4. Create D1 database: `wrangler d1 create adocavo-db`
5. Run schema migration: `wrangler d1 execute adocavo-db --file=schema.sql`
6. Configure bindings in `wrangler.toml`

### Step 2: Database Schema & Seed Data

1. Implement schema (users, hooks, generated_scripts, waitlist)
2. Manually curate 20 viral hooks from TikTok Creative Center
3. Seed hooks table with engagement scores + categories
4. Create admin script: `npm run seed-hooks`

### Step 3: Authentication System

1. Configure NextAuth.js with Google OAuth provider
2. Implement custom D1 adapter (ref: [NextAuth D1 Example](https://authjs.dev))
3. Create middleware for protected routes
4. Add `credits` column to session object
5. Test: signup → 10 credits assigned → logout/login → credits persist

### Step 4: Hook Library Page (`/`)

1. Build grid layout component (Tailwind CSS)
2. Fetch hooks from D1 via Server Action
3. Implement category filter (client-side)
4. Add search functionality (server-side)
5. Create hook card: heat score badge + hook text + "Remix" button
6. Cache hook data (24hr TTL via Workers Cache API)

### Step 5: Script Generator (`/remix/[hook_id]`)

1. Create dynamic route with hook_id parameter
2. Fetch selected hook from D1
3. Build form: product input (textarea, 500 char limit)
4. Implement credit check middleware
5. Create API route: `POST /api/generate`
   - Check user credits (D1 query)
   - Construct prompt (system + user template)
   - Call Workers AI binding
   - Parse JSON response (3 script variations)
   - Deduct 1 credit (atomic update with retry)
   - Save to `generated_scripts` table
   - Return scripts to client
6. Display results with copy-to-clipboard buttons
7. Error handling: insufficient credits → waitlist modal

### Step 6: Credit System & Waitlist

1. Create credit balance component (header)
2. Implement optimistic locking for credit deductions:
   ```sql
   UPDATE users
   SET credits = credits - 1
   WHERE id = ? AND credits >= 1
   ```
3. Build waitlist modal: email + feature request dropdown
4. API route: `POST /api/waitlist`
5. Test race condition: 2 simultaneous generations with 1 credit

### Step 7: User Dashboard (`/dashboard`)

1. Fetch user's generated scripts (paginated, 10 per page)
2. Display: timestamp, hook used, product name, script preview
3. Add "View Full Script" modal
4. Implement delete functionality
5. Show credit balance prominently

### Step 8: Testing & Deployment

1. Local testing: `npm run dev` with Wrangler bindings
2. Create 10 test accounts with varying credit levels
3. Verify: auth flow, credit deduction, script quality, error states
4. Deploy to Cloudflare Pages: `npm run deploy`
5. Set up custom domain DNS (CNAME to Pages)
6. Test production: E2E user journey

### Step 9: Soft Launch

1. Invite 50 beta users (personal network)
2. Monitor Cloudflare Analytics: request count, error rate, P95 latency
3. Collect feedback: script quality, UX friction, feature requests
4. Iterate: adjust prompts, fix bugs, refine UI

### Step 10: Public Launch

1. Content marketing: blog post on "viral hook patterns"
2. SEO: optimize hook pages for "[category] TikTok hooks"
3. Community: share in r/ecommerce, indie hackers
4. Monitor: signups, activation rate, waitlist conversion

## 5. Phase 2 Roadmap

### Monetization (Week 12)

- Stripe integration for credit purchases
- Pro plan: $29/mo unlimited generations
- Track MRR, CAC, LTV

### Quality Improvements

- Add OpenRouter fallback (GPT-3.5-turbo) for "Premium" tier
- A/B test prompt variations
- Implement user feedback loop ("Was this helpful?")

### Engagement Features

- Email notifications: weekly hook digest
- Hook favoriting/collections
- Script history search

### Scale Preparation

- Migrate to Durable Objects for credit system (if race conditions >1%)
- Add rate limiting (10 req/min per user)
- Implement request queuing for AI (if hitting Workers AI limits)

## 6. Key Risks

### Risk 1: Workers AI Quality Insufficient

- **Impact**: Scripts feel robotic, users churn
- **Mitigation**: Extensive prompt engineering phase before launch; benchmark against GPT-4 scripts
- **Contingency**: Offer OpenRouter "Premium" tier at $0.02/generation markup

### Risk 2: NextAuth.js D1 Adapter Instability

- **Impact**: Auth failures, data loss
- **Mitigation**: Thorough testing with 100+ signup cycles; implement custom session validation
- **Contingency**: Fork NextAuth and patch adapter; worst case, build custom JWT auth (3-day effort)

### Risk 3: Users Exhaust Credits Immediately

- **Impact**: Waitlist fills but no monetization signal (users just leave)
- **Mitigation**: Implement 1 free credit/week replenishment; add "invite friends for credits" loop
- **Contingency**: Launch paid plans earlier (Week 6 vs. Week 12)

## 7. Decision Points

### Critical Questions for User

1. **Hook Sourcing Strategy**: Should we scrape TikTok Creative Center (legal gray area) or manually curate (20 hours labor)?
   - **Recommendation**: Manual curation for MVP; add community submissions in Phase 2
   - **User Input Needed**: Confirm time budget for hook curation

2. **AI Model Trade-off**: Start with Workers AI (free, lower quality) or OpenRouter (paid, better quality)?
   - **Cost Implications**: Workers AI = $0, OpenRouter = $0.01/generation ($10/day at 1000 generations)
   - **User Input Needed**: Confirm budget ceiling for AI costs

3. **Credit Replenishment**: One-time 10 credits or weekly refresh?
   - **Trade-off**: One-time = faster monetization signal, Weekly = higher retention
   - **User Input Needed**: Prioritize short-term revenue or long-term engagement?

4. **Launch Scope**: Include user dashboard in MVP or post-launch?
   - **Time Impact**: Dashboard adds 1-2 days development
   - **User Input Needed**: Is history viewing critical for Day 1?

### Technical Validation Needed

1. **D1 Transactions**: Test concurrent credit deductions with 100 parallel requests
2. **Workers AI Latency**: Measure P99 latency for script generation (target <15s)
3. **NextAuth D1 Adapter**: Validate session persistence across 1000 auth cycles

## 8. Implementation Notes

### NextAuth.js D1 Adapter

Since there's no official D1 adapter, use this pattern:

```typescript
// lib/auth-adapter.ts
export function D1Adapter(db: D1Database) {
  return {
    async createUser(user) {
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO users (id, name, email, avatar_url, credits) VALUES (?, ?, ?, ?, 10)",
        )
        .bind(id, user.name, user.email, user.image)
        .run();
      return { ...user, id, credits: 10 };
    },
    async getUser(id) {
      return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    },
    // ... implement remaining methods
  };
}
```

### Credit Deduction with Optimistic Locking

```typescript
// api/generate/route.ts
async function deductCredit(userId: string, db: D1Database) {
  const result = await db
    .prepare(
      "UPDATE users SET credits = credits - 1 WHERE id = ? AND credits >= 1",
    )
    .bind(userId)
    .run();

  if (result.meta.changes === 0) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
}
```

### Workers AI Prompt Template

```typescript
// lib/prompts.ts
export const SYSTEM_PROMPT = `
You are a viral TikTok ad scriptwriter specializing in UGC-style content.
Output ONLY valid JSON. Do not include markdown formatting or explanations.
Follow this structure:
{
  "scripts": [
    {"title": "...", "body": "..."}
  ]
}
`;

export const generatePrompt = (hook: string, product: string) => `
HOOK (must be first line of script): "${hook}"
PRODUCT: ${product}

Generate 3 ad scripts (15-30 sec each):
1. Pain Point focus: emphasize problem solved
2. Benefit focus: highlight transformation
3. Social Proof focus: "everyone's using this"

Format each as:
[Visual: ...]
(Audio: ...)
`;
```

## 9. Success Criteria (8-Week Checkpoint)

| Metric                 | Target | Actual | Status |
| ---------------------- | ------ | ------ | ------ |
| Signups                | 500    | TBD    | ⏳     |
| WAU (3+ generations)   | 100    | TBD    | ⏳     |
| Activation Rate        | 70%    | TBD    | ⏳     |
| Avg Credits Used       | 3.5    | TBD    | ⏳     |
| Waitlist Conversion    | 25%    | TBD    | ⏳     |
| P95 Generation Latency | <15s   | TBD    | ⏳     |
| Error Rate             | <2%    | TBD    | ⏳     |

### Go/No-Go Decision

- **Go (Proceed to Phase 2)**: 80+ WAU, 20%+ waitlist conversion
- **Pivot**: 500+ signups but <50 WAU → Problem: engagement, not acquisition (add gamification)
- **No-Go**: <200 signups → Problem: value prop unclear (validate market need)

---

## Appendix: File Structure

```
adocavo.net/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Hook library
│   │   ├── remix/[id]/page.tsx      # Script generator
│   │   ├── dashboard/page.tsx       # User history
│   │   └── api/
│   │       ├── generate/route.ts    # AI generation
│   │       ├── waitlist/route.ts    # Waitlist signup
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── HookCard.tsx
│   │   ├── ScriptDisplay.tsx
│   │   └── WaitlistModal.tsx
│   └── lib/
│       ├── auth-adapter.ts          # D1 adapter
│       ├── prompts.ts               # AI prompts
│       └── db.ts                    # D1 client
├── schema.sql                       # Database schema
├── wrangler.toml                    # Cloudflare config
├── next.config.js                   # Next.js + Pages adapter
└── package.json
```

---

**Next Command**: If approved, reply `Execute` to generate:

1. `package.json` (dependencies)
2. `wrangler.toml` (D1 + AI bindings)
3. `schema.sql` (database schema)
4. `src/lib/prompts.ts` (AI prompts)
5. `src/app/api/generate/route.ts` (core logic)
