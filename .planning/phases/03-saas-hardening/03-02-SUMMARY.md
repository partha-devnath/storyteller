---
phase: 03-saas-hardening
plan: 02
subsystem: billing
tags:
  [
    billing,
    stripe,
    subscriptions,
    plan-limits,
    rate-limit,
    webhooks,
    402,
    bun,
    hono,
  ]
requires:
  - phase: 03-saas-hardening
    provides: subscription Drizzle table, PLANS config (free 2/5/50/500, pro null/25/5000/null), usage counters, computeBillingState, env Stripe vars
provides:
  - BillingProvider abstraction (stripe + mock) selected by BILLING_PROVIDER; checkout/portal session creation
  - subscription-transitions service (getOrgSubscription/getOrgPlan/applySubscriptionTransition/setOrgPlan) with pure mapSubscriptionEventToState
  - plan-limits service: assertLimit + LimitError (402, code limit_reached) + computeLimitDecision
  - billing routes (GET /:id/billing, POST checkout, POST downgrade, GET portal) + stripe webhook route with signature verification
  - rateLimiter extracted to middleware/rate-limit.ts (shared across app)
  - assertLimit enforced at 7 mutation sites (projects, orgs invite, ai x3, cards, apply-proposal)
affects:
  [03-03-analytics-template, 03-04-frontend-hooks, 03-07-e2e, 03-08-deploy]

tech-stack:
  added:
    - stripe@22.4.0 (exact pin; human-vetted at blocking gate — owner Stripe, MIT, 0 OSV advisories, no install scripts)
  patterns:
    - "BILLING_PROVIDER=mock default mirrors AI_PROVIDER=mock — providers funnel webhook events through one pure mapping helper"
    - "Signature-first webhook handling: constructEvent before any state change; unverifiable → 400 with no DB writes"
    - "Server-truth limit enforcement: assertLimit(orgId, metric) at mutation sites, 402 payload serialized by errorHandler"

key-files:
  created:
    - apps/api/src/services/billing/provider.ts
    - apps/api/src/services/billing/stripe-provider.ts
    - apps/api/src/services/billing/mock-provider.ts
    - apps/api/src/services/billing/subscription-transitions.ts
    - apps/api/src/services/plan-limits.ts
    - apps/api/src/middleware/rate-limit.ts
    - apps/api/src/routes/billing.ts
    - apps/api/src/__tests__/plan-limits.test.ts
    - apps/api/src/__tests__/subscription-transitions.test.ts
    - apps/api/src/__tests__/billing-routes.test.ts
    - .planning/phases/03-saas-hardening/03-USER-SETUP.md
  modified:
    - apps/api/package.json
    - bun.lock
    - apps/api/src/app.ts
    - apps/api/src/middleware/error-handler.ts
    - apps/api/src/routes/projects.ts
    - apps/api/src/routes/orgs.ts
    - apps/api/src/routes/ai.ts
    - apps/api/src/routes/cards.ts
    - apps/api/src/services/apply-proposal.ts

key-decisions:
  - "stripe@22.4.0 pinned exact after blocking-human gate approval (owner Stripe, MIT, 15.7M weekly downloads, 0 OSV vulns, no install scripts)"
  - "assertLimit placed after input validation but BEFORE the AI provider call in ai routes — blocks over-limit orgs before burning tokens, still satisfies 'before persistProposal'"
  - "Webhook events normalized into SubscriptionEvent and funneled through pure mapSubscriptionEventToState so stripe + mock share one testable transition path"
  - "current_period_end read defensively (stripe v22 generated types omit it from Subscription/Session interfaces)"

patterns-established:
  - "Provider + singleton factory per env (getBillingProvider) mirroring the AI provider pattern"
  - "Pure decision/mapping helpers (computeLimitDecision, mapSubscriptionEventToState) exported for DB-free unit tests; DB wiring thin"
  - "402 limit payload contract { code: limit_reached, metric, limit, usage } serialized centrally in errorHandler"

requirements-completed: [E2E-03]

duration: 9min
completed: 2026-08-02
---

# Phase 3 Plan 2: Billing API + Plan-Limit Enforcement Summary

**Stripe SDK (22.4.0, human-vetted) with BillingProvider stripe/mock abstraction, subscription-transition service, server-side assertLimit wired at 7 mutation sites returning 402, billing + signature-verified webhook routes, and shared rate limiting extracted from app.ts**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-02T18:30:00Z
- **Completed:** 2026-08-02T18:39:12Z
- **Tasks:** 3 (1 blocking-human gate + 2 auto)
- **Files modified:** 21 (11 created, 9 modified, 1 setup doc)

## Accomplishments

- `stripe@22.4.0` installed exact-pinned (`.npmrc` save-exact) after the blocking-human legitimacy gate: official Stripe SDK, MIT, 15.7M weekly downloads, 0 OSV advisories, no install scripts, provenance-attested tarball
- `BillingProvider` interface + `getBillingProvider()` (BILLING_PROVIDER env switch, mock default) with stripe + mock implementations
- `subscription-transitions`: getOrgSubscription (free default when no row), getOrgPlan, applySubscriptionTransition (upsert), setOrgPlan (downgrade), plus pure `mapSubscriptionEventToState`
- `plan-limits`: `assertLimit` + `LimitError` (status 402, `code: limit_reached`) + pure `computeLimitDecision`
- Billing routes: GET /api/orgs/:id/billing (any member, BillingState contract), POST checkout (pro-only), POST downgrade, GET portal — owner/admin + rateLimiter(10, 60s)
- Webhook route POST /api/stripe/webhook: `constructEvent` signature verification before any state change; unverifiable → 400, mounted with rateLimiter(60, 60s)
- `rateLimiter` extracted verbatim from app.ts to middleware/rate-limit.ts
- `assertLimit` wired at 7 call sites: projects POST, orgs invite, ai generate/process/clarify, cards POST, apply-proposal create branch
- error-handler serializes LimitError as 402 with the UI-SPEC payload shape
- 59 API tests pass (9 new in billing-routes + 2 new pure suites), api typecheck/lint clean, repo-wide typecheck 12/12

## Task Commits

Each task was committed atomically:

1. **Task 1: Stripe package legitimacy gate** - `(no commit — verification-only checkpoint; human approved stripe@22.4.0)`
2. **Task 2: Install stripe + BillingProvider (stripe/mock) + subscription transitions + plan-limits service** - `8cd5ac7` (feat)
3. **Task 3: Billing + webhook routes, rate limiting, enforcement wiring, mounting** - `cd45efc` (feat)

**Plan metadata:** `docs(03-02): complete billing api plan` (final docs commit — SUMMARY + STATE/ROADMAP/REQUIREMENTS + USER-SETUP)

## Files Created/Modified

- `apps/api/src/services/billing/provider.ts` - BillingProvider type, getBillingProvider(), billingProvider singleton
- `apps/api/src/services/billing/stripe-provider.ts` - createStripeProvider: Checkout, Customer Portal, constructEvent-verified webhook
- `apps/api/src/services/billing/mock-provider.ts` - createMockProvider: mock-checkout/mock-portal URLs, body-based webhook
- `apps/api/src/services/billing/subscription-transitions.ts` - getOrgSubscription/getOrgPlan/applySubscriptionTransition/setOrgPlan/mapSubscriptionEventToState
- `apps/api/src/services/plan-limits.ts` - assertLimit, LimitError (402), computeLimitDecision
- `apps/api/src/middleware/rate-limit.ts` - shared rateLimiter extracted from app.ts
- `apps/api/src/routes/billing.ts` - billingRoutes + stripeWebhookRoutes
- `apps/api/src/__tests__/plan-limits.test.ts` - boundary/limit tests, LimitError fields
- `apps/api/src/__tests__/subscription-transitions.test.ts` - pure event mapping tests
- `apps/api/src/__tests__/billing-routes.test.ts` - 401 gates, webhook 400, mock provider checks
- `apps/api/src/app.ts` - imports rateLimiter, mounts billing + stripe routes
- `apps/api/src/middleware/error-handler.ts` - LimitError → 402 branch
- `apps/api/src/routes/{projects,orgs,ai,cards}.ts` + `services/apply-proposal.ts` - assertLimit call sites
- `apps/api/package.json`, `bun.lock` - stripe@22.4.0 exact pin
- `.planning/phases/03-saas-hardening/03-USER-SETUP.md` - stripe env vars + webhook config (staging/prod only)

## Decisions Made

- stripe@22.4.0 exact pin after blocking-human gate (Task 1): official Stripe SDK, MIT, no install scripts, 0 known advisories
- Route param named `:id` (not `:orgId`) to match requireOrg's `param("id")` fallback — path shape `/api/orgs/{orgId}/billing` unchanged, consistent with orgs.ts
- assertLimit in ai routes placed after input validation but before the AI provider call — blocks over-limit orgs before burning model tokens (still before persistProposal)
- Webhook events normalized to SubscriptionEvent → pure mapSubscriptionEventToState — stripe + mock share one transition path
- current_period_end read defensively: stripe v22 generated types dropped it from Subscription/Session interfaces (real API field, absent in types)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] stripe v22 types omit `current_period_end` on Subscription/Session**

- **Found during:** Task 2 (stripe-provider typecheck)
- **Issue:** `bun --filter api typecheck` failed: `Property 'current_period_end' does not exist on type 'Session'/'Subscription'`. The pinned stripe v22 generated types dropped this real API field from both interfaces.
- **Fix:** Added `getCurrentPeriodEnd(obj)` helper reading `current_period_end` defensively via a narrow cast (unix seconds → Date). Stripe API still returns the field; only the type model lacks it.
- **Files modified:** apps/api/src/services/billing/stripe-provider.ts
- **Verification:** api typecheck passes, tests green
- **Committed in:** 8cd5ac7 (Task 2 commit)

**2. [Rule 1 - Bug] Initial pro-limits test assumed all pro limits null**

- **Found during:** Task 2 (first test run)
- **Issue:** Test `pro never blocks (all limits null)` failed — PLANS.pro has numeric limits for members (25) and aiActions (5000); only projects/cards are null.
- **Fix:** Corrected test to assert null-limit metrics never block (projects/cards) and numeric-limit metrics block at boundary (members 25, aiActions 5000) — matches server-truth PLANS config.
- **Files modified:** apps/api/src/**tests**/plan-limits.test.ts
- **Verification:** 50/50 tests pass after fix
- **Committed in:** 8cd5ac7 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes required for correctness (types) and accurate test assertions (server-truth limits). No scope creep.

## Issues Encountered

- None beyond the deviations above.

## Authentication Gates

- **Task 1 (blocking-human package gate):** `stripe` npm package legitimacy verified via live registry lookups (version 22.4.0, license MIT, maintainer stripe-bindings, 15.7M weekly downloads, GitHub stripe/stripe-node, 0 OSV vulns, no install scripts, SLSA provenance). Human approved installation — normal flow, not a deviation.

## User Setup Required

**Stripe configuration is staging/production only.** See [03-USER-SETUP.md](./03-USER-SETUP.md) for:

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `BILLING_PROVIDER=stripe`
- Webhook endpoint creation (checkout.session.completed, customer.subscription.updated/deleted)
- Local dev + E2E run entirely in mock mode — no Stripe account needed

## Known Stubs

None. The mock provider is an intentional deterministic test/dev path (mirrors AI_PROVIDER=mock), not a stub — real Stripe keys switch it off via BILLING_PROVIDER=stripe.

## Threat Flags

| Flag                          | File                           | Description                                                                                                                                                                         |
| ----------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| threat_flag: webhook_endpoint | apps/api/src/routes/billing.ts | New inbound POST /api/stripe/webhook (network surface) — signature-gated (constructEvent), rate-limited 60/min, 400 on unverifiable payloads. In plan threat model T-03-10/T-03-14. |

## Next Phase Readiness

- Ready for **03-03** (analytics/template API): billing routes + rate-limit middleware are reference patterns
- Ready for **03-04** (frontend hooks): GET /api/orgs/:id/billing BillingState contract + 402 `{ code: limit_reached }` payload consumed by UI
- Ready for **03-07** (E2E): mock provider returns deterministic mock-checkout/mock-portal URLs (E2E B1 asserts navigation); webhook 400s unverifiable bodies
- Ready for **03-08** (deploy): USER-SETUP.md documents the 3 Stripe env vars + webhook creation steps
- Threat model honored: T-03-10 (constructEvent), T-03-11 (assertLimit x7), T-03-12 (role gates), T-03-13 (org-scoped), T-03-14 (rate limits), T-03-15 (mock-only body path), T-03-16 (immediate downgrade documented), T-03-SC (human-vetted package)

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 10 key files exist on disk (verified with `[ -f ]`)
- Both task commits present in git log: `8cd5ac7` (Task 2), `cd45efc` (Task 3)
- 59 API tests pass, api typecheck/lint clean, repo-wide typecheck 12/12
- assertLimit ≥ 5 call sites (7 confirmed), constructEvent present (1), LimitError → 402 `limit_reached` serialized
