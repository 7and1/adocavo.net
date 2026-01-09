# Development Roadmap - Adocavo Intelligence

## Document Purpose

This document provides a week-by-week implementation plan with task breakdowns, dependencies, testing checkpoints, launch criteria, and post-launch monitoring for the Adocavo Intelligence MVP.

**Version**: 1.0.0
**Last Updated**: 2026-01-09
**Reference**: [BLUEPRINT.md](./BLUEPRINT.md)

---

## 1. Executive Summary

### Timeline Overview

| Phase  | Duration | Focus                     | Outcome            |
| ------ | -------- | ------------------------- | ------------------ |
| Setup  | Week 1   | Infrastructure + Auth     | Working auth flow  |
| Core   | Week 2-3 | Hook Library + Generation | End-to-end MVP     |
| Polish | Week 4   | UI/UX + Testing           | Production-ready   |
| Launch | Week 5   | Soft launch + Iteration   | 50 beta users      |
| Scale  | Week 6-8 | Public launch + Growth    | 500 signups target |

### Key Milestones

- **Day 7**: Authentication working, database seeded
- **Day 14**: Hook library functional, basic generation
- **Day 21**: Full generation flow, dashboard complete
- **Day 28**: Production deployed, soft launch
- **Day 56**: 100 WAU target

---

## 2. Week 1: Infrastructure & Authentication

### Day 1-2: Project Setup

#### Tasks

| Task                          | Priority | Est. Hours | Dependencies       |
| ----------------------------- | -------- | ---------- | ------------------ |
| Create Cloudflare account     | Critical | 0.5        | None               |
| Purchase/configure domain     | Critical | 0.5        | Cloudflare account |
| Initialize Next.js 15 project | Critical | 1          | None               |
| Install core dependencies     | Critical | 0.5        | Next.js project    |
| Configure TypeScript          | High     | 0.5        | Next.js project    |
| Setup ESLint + Prettier       | Medium   | 0.5        | Next.js project    |
| Initialize Git repository     | High     | 0.5        | Next.js project    |
| Create project structure      | High     | 1          | Next.js project    |

#### Commands

```bash
# Create Next.js project
npx create-next-app@latest adocavo.net --typescript --tailwind --app --src-dir

# Install dependencies
cd adocavo.net
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm zod nanoid
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D drizzle-kit @cloudflare/workers-types wrangler

# Initialize Cloudflare
wrangler login
wrangler d1 create adocavo-db
```

#### Acceptance Criteria

- [ ] `npm run dev` starts without errors
- [ ] TypeScript compiles successfully
- [ ] Tailwind CSS working
- [ ] Cloudflare D1 database created
- [ ] Git repository initialized with .gitignore

---

### Day 3-4: Database Schema & Drizzle Setup

#### Tasks

| Task                          | Priority | Est. Hours | Dependencies        |
| ----------------------------- | -------- | ---------- | ------------------- |
| Create Drizzle schema file    | Critical | 2          | Project setup       |
| Configure drizzle.config.ts   | Critical | 0.5        | Schema file         |
| Generate initial migration    | Critical | 0.5        | Drizzle config      |
| Apply migration to D1         | Critical | 0.5        | Migration generated |
| Create database client helper | High     | 0.5        | Migration applied   |
| Verify schema in D1 console   | High     | 0.5        | Migration applied   |

#### Schema Implementation

```typescript
// src/lib/schema.ts - Full implementation in BLUEPRINT.md
```

#### Acceptance Criteria

- [ ] All tables created in D1
- [ ] Drizzle types inferred correctly
- [ ] `db.query.users.findFirst()` returns type-safe result
- [ ] Foreign key constraints working

---

### Day 5-7: Authentication System

#### Tasks

| Task                                      | Priority | Est. Hours | Dependencies     |
| ----------------------------------------- | -------- | ---------- | ---------------- |
| Configure Auth.js with Drizzle adapter    | Critical | 3          | Database ready   |
| Setup Google OAuth provider               | Critical | 1          | Auth.js config   |
| Setup GitHub OAuth provider               | High     | 1          | Auth.js config   |
| Create sign-in page                       | Critical | 2          | OAuth configured |
| Create sign-out flow                      | High     | 1          | Auth.js config   |
| Implement middleware for protected routes | Critical | 2          | Auth.js config   |
| Add credits to session                    | High     | 1          | Auth.js config   |
| Test auth flow end-to-end                 | Critical | 2          | All auth tasks   |

#### OAuth Setup Steps

1. **Google Cloud Console**:
   - Create new project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect: `http://localhost:3000/api/auth/callback/google`
   - Add authorized redirect: `https://adocavo.net/api/auth/callback/google`

2. **GitHub Developer Settings**:
   - Create new OAuth App
   - Homepage URL: `https://adocavo.net`
   - Callback URL: `https://adocavo.net/api/auth/callback/github`

#### Acceptance Criteria

- [ ] Sign in with Google works
- [ ] Sign in with GitHub works
- [ ] New users receive 10 credits
- [ ] Session includes user ID and credits
- [ ] Protected routes redirect to sign-in
- [ ] Sign out clears session

---

## 3. Week 2: Hook Library & Core UI

### Day 8-10: Hook Library Page

#### Tasks

| Task                             | Priority | Est. Hours | Dependencies    |
| -------------------------------- | -------- | ---------- | --------------- |
| Create hook seed data (20 hooks) | Critical | 4          | Database ready  |
| Implement seed script            | High     | 1          | Seed data       |
| Build HookCard component         | Critical | 2          | None            |
| Build HookGrid component         | Critical | 2          | HookCard        |
| Build HookFilters component      | High     | 2          | None            |
| Implement category filtering     | High     | 1          | HookFilters     |
| Implement search functionality   | Medium   | 1          | HookFilters     |
| Create home page layout          | Critical | 2          | All components  |
| Add loading skeletons            | Medium   | 1          | Grid components |

#### Seed Data Structure

```typescript
// scripts/seed-hooks.ts
const seedHooks = [
  {
    id: "hook_001",
    text: "Stop scrolling if you have acne",
    category: "beauty",
    engagementScore: 95,
    source: "manual_curation",
  },
  {
    id: "hook_002",
    text: "This is your sign to start that side hustle",
    category: "finance",
    engagementScore: 92,
    source: "manual_curation",
  },
  // ... 18 more hooks
];
```

#### Acceptance Criteria

- [ ] 20 hooks displayed in grid
- [ ] Category filters work
- [ ] Search finds matching hooks
- [ ] Engagement score badges display correctly
- [ ] "Remix" button visible on each card
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading skeletons show during fetch

---

### Day 11-12: Script Generator UI

#### Tasks

| Task                                | Priority | Est. Hours | Dependencies    |
| ----------------------------------- | -------- | ---------- | --------------- |
| Create remix/[id]/page.tsx route    | Critical | 1          | Hook library    |
| Build ScriptGenerator component     | Critical | 3          | None            |
| Build ScriptDisplay component       | Critical | 2          | None            |
| Implement character counter         | Medium   | 0.5        | ScriptGenerator |
| Add copy-to-clipboard functionality | High     | 1          | ScriptDisplay   |
| Create loading state for generation | High     | 1          | ScriptGenerator |
| Build error handling UI             | High     | 1          | ScriptGenerator |

#### Acceptance Criteria

- [ ] Remix page loads selected hook
- [ ] Product description input with validation
- [ ] Character counter (20-500)
- [ ] Generate button disabled until valid
- [ ] Loading spinner during generation
- [ ] 3 script cards displayed after generation
- [ ] Copy button works with feedback

---

### Day 13-14: Generation API

#### Tasks

| Task                                               | Priority | Est. Hours | Dependencies     |
| -------------------------------------------------- | -------- | ---------- | ---------------- |
| Create few-shot prompt templates                   | Critical | 3          | None             |
| Implement /api/generate route                      | Critical | 3          | Prompts          |
| Implement credit deduction with optimistic locking | Critical | 2          | Generate route   |
| Add AI response parsing                            | High     | 2          | Generate route   |
| Implement credit refund on failure                 | High     | 1          | Credit deduction |
| Save generated scripts to database                 | High     | 1          | Generate route   |
| Add request validation with Zod                    | High     | 1          | Generate route   |
| Test generation end-to-end                         | Critical | 2          | All API tasks    |

#### Few-Shot Prompt Implementation

```typescript
// src/lib/prompts.ts - Full implementation in BLUEPRINT.md
```

#### Acceptance Criteria

- [ ] Generation returns 3 valid scripts
- [ ] Scripts sound authentic (not AI-corporate)
- [ ] Credit deducted on success
- [ ] Credit refunded on failure
- [ ] Scripts saved to database
- [ ] <15s total generation time
- [ ] Proper error messages for edge cases

---

## 4. Week 3: Dashboard & Waitlist

### Day 15-17: User Dashboard

#### Tasks

| Task                            | Priority | Est. Hours | Dependencies  |
| ------------------------------- | -------- | ---------- | ------------- |
| Create dashboard/page.tsx route | Critical | 1          | Auth working  |
| Build ScriptHistory component   | Critical | 3          | None          |
| Implement pagination            | Medium   | 2          | ScriptHistory |
| Add delete functionality        | High     | 1          | ScriptHistory |
| Create expandable script cards  | Medium   | 2          | ScriptHistory |
| Add empty state                 | Medium   | 1          | ScriptHistory |
| Implement script search         | Low      | 2          | ScriptHistory |

#### Acceptance Criteria

- [ ] Dashboard requires authentication
- [ ] User's scripts displayed chronologically
- [ ] Pagination works (10 per page)
- [ ] Delete confirms and removes script
- [ ] Expand shows full script content
- [ ] Copy works from dashboard
- [ ] Empty state with CTA to library

---

### Day 18-19: Waitlist & Credit System

#### Tasks

| Task                                  | Priority | Est. Hours | Dependencies  |
| ------------------------------------- | -------- | ---------- | ------------- |
| Build WaitlistModal component         | Critical | 2          | None          |
| Create /api/waitlist route            | Critical | 1          | None          |
| Trigger modal on INSUFFICIENT_CREDITS | Critical | 1          | WaitlistModal |
| Add feature interest selection        | High     | 1          | WaitlistModal |
| Build CreditBalance component         | High     | 1          | None          |
| Add credit balance to header          | High     | 0.5        | CreditBalance |
| Style low/empty credit states         | Medium   | 1          | CreditBalance |

#### Acceptance Criteria

- [ ] Waitlist modal appears at 0 credits
- [ ] Email collected and stored
- [ ] Feature interest selection works
- [ ] Success confirmation displayed
- [ ] Credit balance visible in header
- [ ] Warning colors for low credits

---

### Day 20-21: Fake Door Test & Health Endpoint

#### Tasks

| Task                               | Priority | Est. Hours | Dependencies |
| ---------------------------------- | -------- | ---------- | ------------ |
| Build FakeDoorAnalyzeUrl component | High     | 2          | None         |
| Create /api/track-fake-door route  | High     | 1          | None         |
| Add component to home page         | High     | 0.5        | Component    |
| Implement click tracking           | High     | 1          | API route    |
| Create /api/health route           | Critical | 2          | Database     |
| Add database check to health       | Critical | 1          | Health route |
| Add AI check to health             | High     | 1          | Health route |

#### Acceptance Criteria

- [ ] "Analyze URL" button visible with "Coming Soon" badge
- [ ] Click opens email signup modal
- [ ] Clicks tracked in database
- [ ] /api/health returns 200 when healthy
- [ ] Health includes database and AI status
- [ ] Stats included in health response

---

## 5. Week 4: Polish & Testing

### Day 22-23: UI/UX Polish

#### Tasks

| Task                              | Priority | Est. Hours | Dependencies   |
| --------------------------------- | -------- | ---------- | -------------- |
| Implement responsive design fixes | High     | 3          | All UI         |
| Add loading states everywhere     | High     | 2          | All pages      |
| Improve error messages            | High     | 2          | All forms      |
| Add toast notifications           | Medium   | 2          | None           |
| Keyboard navigation audit         | Medium   | 2          | All components |
| Focus management improvements     | Medium   | 1          | All modals     |
| Add animations/transitions        | Low      | 2          | All components |

#### Acceptance Criteria

- [ ] All pages responsive 320px-1920px
- [ ] Loading skeletons on all data fetches
- [ ] Toast notifications for actions
- [ ] Tab navigation works throughout
- [ ] Focus trapped in modals
- [ ] Smooth transitions on state changes

---

### Day 24-25: Testing

#### Tasks

| Task                               | Priority | Est. Hours | Dependencies      |
| ---------------------------------- | -------- | ---------- | ----------------- |
| Write unit tests for services      | Critical | 4          | Services complete |
| Write integration tests for API    | Critical | 4          | API complete      |
| Setup Playwright for E2E           | High     | 2          | None              |
| Write E2E test for generation flow | Critical | 3          | Playwright        |
| Write E2E test for auth flow       | High     | 2          | Playwright        |
| Test credit edge cases             | Critical | 2          | All tests         |
| Performance audit (Lighthouse)     | High     | 2          | All features      |

#### Test Coverage Targets

| Category          | Target     | Priority |
| ----------------- | ---------- | -------- |
| Unit tests        | 80%        | Critical |
| Integration tests | 70%        | High     |
| E2E tests         | Core flows | Critical |
| Lighthouse score  | 90+        | High     |

#### Acceptance Criteria

- [ ] Unit tests pass with 80% coverage
- [ ] Integration tests pass
- [ ] E2E tests cover auth + generation
- [ ] Lighthouse performance 90+
- [ ] No critical accessibility issues

---

### Day 26-28: Pre-Launch Preparation

#### Tasks

| Task                             | Priority | Est. Hours | Dependencies       |
| -------------------------------- | -------- | ---------- | ------------------ |
| Security audit                   | Critical | 3          | All features       |
| Configure production environment | Critical | 2          | Cloudflare         |
| Set production secrets           | Critical | 1          | Environment config |
| Run database migrations (prod)   | Critical | 0.5        | Migrations         |
| Seed production hooks            | Critical | 1          | Seed script        |
| DNS configuration                | Critical | 1          | Domain             |
| SSL verification                 | Critical | 0.5        | DNS                |
| Final E2E test on production     | Critical | 2          | Deployment         |

#### Security Checklist

- [ ] No secrets in code
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Rate limiting active
- [ ] SQL injection prevented (Drizzle)
- [ ] XSS prevented (React)
- [ ] CSRF protection (Auth.js)

#### Acceptance Criteria

- [ ] Production deployed to adocavo.net
- [ ] SSL certificate active
- [ ] All environment variables set
- [ ] Health endpoint returns 200
- [ ] Full user journey works on production

---

## 6. Week 5: Soft Launch

### Day 29-35: Beta User Testing

#### Tasks

| Task                            | Priority | Est. Hours | Dependencies     |
| ------------------------------- | -------- | ---------- | ---------------- |
| Invite 50 beta users            | Critical | 2          | Production ready |
| Create feedback collection form | High     | 1          | None             |
| Setup analytics tracking        | High     | 2          | Production       |
| Monitor error rates             | Critical | Ongoing    | Launch           |
| Daily check-ins with users      | High     | 1/day      | Beta users       |
| Bug fixes (estimate 20 hours)   | Critical | 20         | Feedback         |
| Prompt quality improvements     | High     | 4          | Feedback         |

#### Beta User Sources

- Personal network (10)
- Twitter/X followers (10)
- IndieHackers community (10)
- Reddit r/ecommerce (10)
- Discord communities (10)

#### Feedback Collection

```markdown
# Beta Feedback Form

1. How would you rate the script quality? (1-5)
2. Did the scripts sound authentic/natural?
3. What was most useful about the tool?
4. What was frustrating or confusing?
5. Would you pay for unlimited scripts? If so, how much?
6. What features would you want next?
```

#### Acceptance Criteria

- [ ] 50 beta users invited
- [ ] 70% activation rate (used 1 credit)
- [ ] Average rating 3.5+ / 5
- [ ] <5% error rate
- [ ] All critical bugs fixed

---

## 7. Week 6-8: Public Launch & Growth

### Week 6: Public Launch

#### Tasks

| Task                        | Priority | Est. Hours | Dependencies  |
| --------------------------- | -------- | ---------- | ------------- |
| Publish launch blog post    | High     | 4          | Content ready |
| ProductHunt launch prep     | High     | 4          | None          |
| Reddit posts (3 subreddits) | Medium   | 2          | Launch        |
| IndieHackers post           | Medium   | 2          | Launch        |
| Twitter/X announcement      | Medium   | 1          | Launch        |
| Respond to comments         | High     | Ongoing    | Launch        |

#### Launch Content

1. **Blog Post**: "How We Built a TikTok Ad Script Generator in 4 Weeks"
2. **ProductHunt**: Launch with video demo + launch offer
3. **Reddit**: Value-first posts in r/ecommerce, r/tiktokmarketing, r/dropshipping

#### Acceptance Criteria

- [ ] 200+ signups in launch week
- [ ] ProductHunt top 10 daily
- [ ] 3 blog posts published
- [ ] Social media posts scheduled

---

### Week 7-8: Growth & Iteration

#### Tasks

| Task                             | Priority | Est. Hours | Dependencies |
| -------------------------------- | -------- | ---------- | ------------ |
| Analyze usage data               | Critical | 4          | Analytics    |
| Add 30 more hooks                | High     | 8          | Feedback     |
| Improve prompt based on feedback | High     | 6          | Usage data   |
| SEO optimization                 | Medium   | 6          | Content      |
| A/B test landing page            | Medium   | 4          | Analytics    |
| Prepare Phase 2 roadmap          | High     | 4          | All data     |

#### Success Metrics (Week 8)

| Metric           | Target    | Priority |
| ---------------- | --------- | -------- |
| Total signups    | 500       | Critical |
| WAU (3+ scripts) | 100       | Critical |
| Activation rate  | 70%       | High     |
| Waitlist signups | 125 (25%) | High     |
| Error rate       | <2%       | Critical |
| P95 latency      | <15s      | High     |

---

## 8. Risk Management

### Technical Risks

| Risk                            | Impact | Probability | Mitigation                                 |
| ------------------------------- | ------ | ----------- | ------------------------------------------ |
| Workers AI quality insufficient | High   | Medium      | Pre-validate prompts, OpenRouter fallback  |
| D1 adapter issues               | High   | Low         | Thorough testing, custom adapter if needed |
| Rate limiting by Workers AI     | Medium | Medium      | Request queuing, caching                   |
| Auth session issues             | High   | Low         | Custom JWT fallback                        |

### Business Risks

| Risk                            | Impact | Probability | Mitigation                          |
| ------------------------------- | ------ | ----------- | ----------------------------------- |
| Low signup conversion           | High   | Medium      | Multiple launch channels            |
| Users exhaust credits and leave | High   | Medium      | Weekly credit refresh option        |
| Script quality complaints       | Medium | Medium      | Quality rating + refund policy      |
| Competition launches similar    | Low    | Low         | First-mover advantage, hook library |

### Contingency Plans

1. **If signups < 100 in Week 6**:
   - Double down on content marketing
   - Offer extended free credits
   - Partner with influencers

2. **If activation < 50%**:
   - Improve onboarding flow
   - Add tutorial/walkthrough
   - Simplify first generation

3. **If AI quality fails**:
   - Switch to OpenRouter (budget $100/month)
   - Offer "Premium Generation" at $0.50/script

---

## 9. Resource Allocation

### Development Time

| Week | Hours | Focus                  |
| ---- | ----- | ---------------------- |
| 1    | 40    | Infrastructure + Auth  |
| 2    | 40    | Hook Library + UI      |
| 3    | 40    | Generation + Dashboard |
| 4    | 40    | Polish + Testing       |
| 5    | 20    | Bug fixes + Support    |
| 6-8  | 30    | Growth + Iteration     |

**Total: ~210 hours to MVP launch**

### Budget Allocation

| Item             | Monthly Cost | Notes                      |
| ---------------- | ------------ | -------------------------- |
| Cloudflare Pages | $0           | Free tier                  |
| Cloudflare D1    | $0           | Free tier (5M reads/month) |
| Workers AI       | $0           | Free tier (10K req/day)    |
| Domain           | ~$12/year    | adocavo.net                |
| **Total MVP**    | **~$12**     | First 3 months             |

### Phase 2 Budget (If Validated)

| Item                | Monthly Cost | Notes              |
| ------------------- | ------------ | ------------------ |
| OpenRouter fallback | $50-100      | Premium generation |
| Cloudflare Pro      | $25          | Better analytics   |
| Email service       | $20          | User notifications |
| **Total Phase 2**   | **~$145**    | Monthly recurring  |

---

## 10. Post-Launch Monitoring

### Daily Checks

- [ ] Health endpoint status
- [ ] Error rate in logs
- [ ] Generation success rate
- [ ] New signup count
- [ ] Support inbox

### Weekly Reports

```markdown
# Week X Report

## Metrics

- Signups: X (target: Y)
- WAU: X (target: Y)
- Activation: X% (target: 70%)
- Waitlist: X (target: 25%)

## Issues

- [List of bugs/issues]

## User Feedback

- [Key feedback themes]

## Next Week Priorities

1. [Priority 1]
2. [Priority 2]
3. [Priority 3]
```

### Alerting Rules

| Metric              | Threshold | Alert Channel |
| ------------------- | --------- | ------------- |
| Error rate          | >5%       | Slack + Email |
| P95 latency         | >30s      | Slack         |
| Health endpoint     | Not 200   | PagerDuty     |
| Generation failures | >10/hour  | Slack         |

---

## 11. Definition of Done

### Feature Complete

- [ ] All tasks in roadmap completed
- [ ] No critical or high-priority bugs
- [ ] Test coverage meets targets
- [ ] Performance meets targets

### Launch Ready

- [ ] Production environment stable
- [ ] 50 beta users validated
- [ ] Launch content prepared
- [ ] Monitoring configured
- [ ] Rollback plan documented

### Phase 1 Success

- [ ] 500 signups achieved
- [ ] 100 WAU achieved
- [ ] 70% activation rate
- [ ] 25% waitlist conversion
- [ ] Phase 2 roadmap approved

---

## 12. Related Documentation

| Document                                                     | Purpose                     |
| ------------------------------------------------------------ | --------------------------- |
| [BLUEPRINT.md](./BLUEPRINT.md)                               | Master implementation guide |
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)     | Service layer patterns      |
| [COMPONENT_SPECIFICATIONS.md](./COMPONENT_SPECIFICATIONS.md) | UI component details        |
| [SEO_CONTENT_STRATEGY.md](./SEO_CONTENT_STRATEGY.md)         | Content marketing plan      |
| [ROUTING_DEPLOYMENT.md](./ROUTING_DEPLOYMENT.md)             | Deployment configuration    |

---

**Document Owner**: Project Lead
**Review Cycle**: Weekly during development
