# Adocavo Intelligence - Product Requirements Document

## Product Vision

Adocavo Intelligence is a TikTok/short-form video ad script generation platform that democratizes viral content creation. By curating proven "hooks" (the critical first 3 seconds) and combining them with AI-powered script generation, we enable marketers, e-commerce sellers, and content creators to produce high-converting ad scripts in minutes rather than days. Built entirely on Cloudflare's edge infrastructure for global performance and minimal operational overhead.

## Target Users

### Primary Persona: Solo E-Commerce Seller

- **Profile**: Shopify/Amazon seller, 1-10 SKUs, no video production team
- **Pain**: Knows video ads work but lacks copywriting skills; hiring costs $500-2000 per script
- **Goal**: Generate 10-20 script variations weekly to test different angles
- **Willingness to pay**: $20-50/month after seeing ROI

### Secondary Persona: Performance Marketing Agency

- **Profile**: 5-20 person team managing multiple DTC clients
- **Pain**: Scriptwriting bottleneck; junior copywriters lack TikTok native voice
- **Goal**: Standardize script quality across team, reduce revision cycles
- **Willingness to pay**: $200-500/month for team seats

### Tertiary Persona: UGC Content Creator

- **Profile**: Freelance creator producing sponsored content
- **Pain**: Brands provide product but no creative direction; wastes time brainstorming
- **Goal**: Quick script starting points to pitch to brands
- **Willingness to pay**: Free tier sufficient, may upgrade for premium hooks

## MVP Features (Phase 1)

### Core User Journey

1. **Discovery**: Browse curated library of 50+ viral hooks filtered by category (Beauty, Tech, Finance, Pets)
2. **Selection**: Click "Remix this Hook" on any card showing engagement score
3. **Input**: Paste product URL or description (100-500 chars)
4. **Generation**: Receive 3 script variations (Pain Point, Benefit, Social Proof angles) in 10-15 seconds
5. **Export**: Copy scripts to clipboard, view in history

### Technical Requirements

- **Authentication**: OAuth via Google/GitHub (NextAuth.js v5)
- **Credit System**:
  - 10 free credits on signup
  - 1 credit = 1 generation (3 scripts)
  - No credit purchase in MVP (waitlist only)
- **Hook Library**: Admin-curated, manual seed data (20-50 hooks)
- **AI Model**: Workers AI Llama 3 8B Instruct (fast, cheap)
- **Performance**: <2s page load, <15s script generation end-to-end

## Success Metrics

### North Star: Weekly Active Generators

Target: 100 users generating 3+ scripts/week by Week 8

### Supporting Metrics

- **Acquisition**: 500 signups in first month
- **Activation**: 70% of signups use 1st free credit within 24hrs
- **Engagement**: 3.5 avg credits used per user
- **Monetization Signal**: 25% waitlist conversion rate
- **Quality**: <5% user-reported "script doesn't match hook" errors

## MVP Exclusions (Phase 2+)

### Explicitly NOT in MVP

- ❌ User-generated hooks (moderation complexity)
- ❌ Video generation (scope creep, cost explosion)
- ❌ Team collaboration features
- ❌ Payment processing (waitlist strategy first)
- ❌ A/B testing analytics
- ❌ Hook performance tracking/attribution

### Why Free-to-Paid Waitlist?

1. **Validation First**: Prove users exhaust 10 credits before building payments
2. **Urgency Creation**: Scarcity psychology (limited Pro slots)
3. **Feature Discovery**: Collect which paid features users want most
4. **Regulatory Safety**: Avoid payment compliance until PMF confirmed

## Phase 2 Roadmap (Post-Validation)

### Tier 1 (If 30%+ users hit credit limit)

- Payment integration (Stripe)
- Credit packs: $9/50 credits, $19/150 credits
- Pro Plan: $29/mo unlimited

### Tier 2 (If agencies show interest)

- Team workspaces
- Brand voice customization
- API access

### Tier 3 (If engagement sustains)

- Hook submission portal (community-sourced)
- Video performance spy tool (scrape TikTok Creative Center)
- Auto-video generation (Synthesia/D-ID integration)

## Open Questions

### Pre-Launch Decisions Needed

1. **Hook Sourcing**: Manual curation vs. scraping TikTok CC vs. user submissions?
   - **Risk**: Copyright/TOS violations if scraped
   - **Recommendation**: Manual curation for MVP (20 hours work)

2. **AI Model Choice**: Workers AI (free tier) vs. OpenRouter (better quality)?
   - **Trade-off**: Free = lower quality scripts, Paid = $0.01/generation
   - **Recommendation**: Start Workers AI, add OpenRouter as "Premium" option in Phase 2

3. **Credit Replenishment**: One-time 10 credits vs. 5 credits/week?
   - **Trade-off**: Weekly = higher retention but delayed monetization signal
   - **Recommendation**: One-time (forces upgrade decision faster)

### Technical Unknowns

- Can D1 handle credit deduction race conditions at scale? (Need transactions)
- Workers AI rate limits for free tier? (May need request queuing)
- NextAuth.js D1 adapter stability? (Not officially supported yet)

## Competitive Landscape

| Competitor           | Strength                      | Weakness                    | Our Differentiation                |
| -------------------- | ----------------------------- | --------------------------- | ---------------------------------- |
| Jasper AI            | Enterprise-grade, brand voice | Generic, expensive ($40/mo) | Hook-first approach, TikTok native |
| Copy.ai              | Cheap ($30/mo), templates     | No video focus              | Curated viral hooks library        |
| AdCreative.ai        | Full visuals + copy           | Complex UX, $30/mo          | Simplicity, free tier              |
| Manual Scriptwriting | Custom quality                | $500-2000/script, slow      | 95% cost reduction, instant        |

**Key Insight**: No one owns the "hook library + remixing" positioning. This is blue ocean.

## Critical Success Factors

### What Must Be True

1. **Hook Quality**: Library must contain genuinely viral patterns (98+ engagement scores)
2. **Voice Authenticity**: Scripts must sound human/UGC, not AI corporate
3. **Speed**: Sub-15s generation or users abandon (attention span = TikTok)
4. **Discoverability**: SEO/content strategy to drive cold traffic (not just paid ads)

### Failure Modes

- Hooks feel outdated (need monthly refresh process)
- AI scripts too generic (need better prompt engineering)
- Users exhaust credits in 10 minutes then leave (need engagement loops)

## Next Steps

1. ✅ Confirm architecture approach (see GENESIS.md)
2. Set up Cloudflare infrastructure (D1 DB, Pages, Workers)
3. Implement authentication + credit system
4. Manually curate 20 seed hooks
5. Prompt engineering for script quality
6. Build 3 core pages (Library, Studio, Dashboard)
7. Soft launch to 50 beta users (personal network)
8. Iterate based on feedback
9. Public launch with content marketing
