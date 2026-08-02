---
phase: 03-saas-hardening
plan: 01
subsystem: billing
tags: [billing, subscription, drizzle, postgres, stripe, plans, limits, zod]
requires:
  - phase: 01-core-loop-mvp-differentiator
    provides: project/organizationMember/proposal/card Drizzle tables + migration infra
provides:
  - Drizzle subscription table (org-scoped, org_id unique, plan free|pro, status active|past_due|canceled, stripe ids, currentPeriodEnd) — migration 0002 applied
  - PLANS plan/limits/pricing config (UI-SPEC V2b contract: free 2/5/50/500 $0, pro unlimited/25/5000/unlimited $12) + PlanId/LimitMetric/PlanLimits/BillingState/AnalyticsState types + planIdSchema
  - Zod billing validations: checkoutTierSchema, templateCreateSchema, analyticsRangeSchema
  - usage.ts org-scoped live counters: getUsage, countProjects, countAcceptedMembers, countAiActionsThisMonth, countCards
  - computeBillingState pure composer producing the UI-SPEC BillingState contract
  - env.ts Stripe vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO (optional), BILLING_PROVIDER (stripe|mock, default mock)
affects:
  [03-02-billing-api, 03-03-analytics-template, 03-04-frontend-hooks, 03-07-e2e]

tech-stack:
  added: []
  patterns:
    - "Org-scoped Drizzle count queries (count() + eq/inArray/isNotNull) — no raw SQL WHERE clauses"
    - "Pure service composers (computeBillingState) with PLANS as server-truth source"
    - "BILLING_PROVIDER=mock default mirroring AI_PROVIDER=mock so dev/E2E run without real Stripe"

key-files:
  created:
    - packages/schemas/src/db/subscription.ts
    - packages/schemas/src/plans.ts
    - packages/schemas/src/validations/billing.ts
    - apps/api/src/services/usage.ts
    - apps/api/src/services/billing-state.ts
    - apps/api/src/__tests__/usage.test.ts
    - apps/api/src/__tests__/billing-state.test.ts
    - packages/db/migrations/0002_smart_black_bolt.sql
    - packages/db/migrations/meta/0002_snapshot.json
  modified:
    - packages/schemas/src/index.ts
    - apps/api/src/env.ts
    - packages/db/migrations/meta/_journal.json

key-decisions:
  - "PLANS limits/prices are compile-time constants in @workspace/schemas (server source of truth) — API never accepts limits from the client (T-03-01 mitigation)"
  - "BILLING_PROVIDER defaults to mock so dev/E2E work without real Stripe keys; Stripe vars all optional"
  - "countAcceptedMembers uses isNotNull(userId) — pending invites (userId null) do not consume the members limit"
  - "countAiActionsThisMonth/countCards resolve org project ids via IN-subquery then count — org-scoped by construction (T-03-02 mitigation)"

patterns-established:
  - "Counter-per-metric named exports so tests assert independently; getUsage fans out via Promise.all"

requirements-completed: [E2E-03]

duration: 4min
completed: 2026-08-02
---

# Phase 3 Plan 1: Billing Data Layer Summary

**Drizzle subscription table (migrated), PLANS free/pro limits+prices config, org-scoped live usage counters, and computeBillingState composer — the shared contract foundation every downstream billing plan builds against**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-02T23:49:30Z
- **Completed:** 2026-08-02T23:53:13Z
- **Tasks:** 3
- **Files modified:** 12 (9 created, 3 modified)

## Accomplishments

- `subscription` Drizzle table created and migrated to docker postgres (org_id unique, plan default 'free', status default 'active', stripe customer/sub ids, currentPeriodEnd) — verified via `\d subscription`
- `PLANS` config matching the UI-SPEC V2b contract exactly: free { projects 2, members 5, aiActions 50, cards 500 } $0, pro { unlimited, 25, 5000, unlimited } $12
- `usage.ts` live org-scoped counters (projects, accepted members, AI actions this calendar month, cards) via Drizzle count queries — never raw SQL WHERE clauses
- `computeBillingState` pure composer producing the exact UI-SPEC BillingState contract
- `env.ts` validates STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_PRO (optional) + BILLING_PROVIDER (stripe|mock, default mock)
- 3 new Zod schemas: checkoutTierSchema, templateCreateSchema, analyticsRangeSchema
- 37 API tests pass (2 new suites), 24 schemas tests pass, repo-wide typecheck 12/12

## Task Commits

Each task was committed atomically:

1. **Task 1: subscription table + PLANS config + billing validations + barrel exports** - `2f4f954` (feat)
2. **Task 2: Usage counting + billing-state composer services (pure logic, unit tested)** - `01da84f` (feat)
3. **Task 3: [BLOCKING] env.ts Stripe vars + run Drizzle migration (generate + migrate) and verify** - `94155d1` (feat)

**Plan metadata:** `docs(03-01): complete billing data layer plan` — final docs commit (SUMMARY + STATE/ROADMAP/REQUIREMENTS), see git log

## Files Created/Modified

- `packages/schemas/src/db/subscription.ts` - Drizzle subscription table (org_id unique, plan/status $type unions, stripe ids)
- `packages/schemas/src/plans.ts` - PLANS config, PlanId/LimitMetric/PlanLimits/PlanConfig types, LIMIT_METRICS, planIdSchema, BillingState/AnalyticsState contracts
- `packages/schemas/src/validations/billing.ts` - checkoutTierSchema, templateCreateSchema, analyticsRangeSchema
- `packages/schemas/src/index.ts` - barrel re-exports for subscription, plans, validations/billing
- `apps/api/src/services/usage.ts` - getUsage + 4 org-scoped counters (Drizzle count queries)
- `apps/api/src/services/billing-state.ts` - computeBillingState pure composer
- `apps/api/src/__tests__/usage.test.ts` - counter exports + getUsage key shape (DB-optional smoke)
- `apps/api/src/__tests__/billing-state.test.ts` - exact free/pro limits + price mapping + passthrough
- `apps/api/src/env.ts` - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, BILLING_PROVIDER
- `packages/db/migrations/0002_smart_black_bolt.sql` - additive-only CREATE TABLE subscription (+ FK + unique index)
- `packages/db/migrations/meta/0002_snapshot.json` + `_journal.json` - drizzle-kit metadata

## Decisions Made

- PLANS limits/prices are compile-time constants — client can never supply limits (validations allow tier only)
- BILLING_PROVIDER=mock default mirrors AI_PROVIDER=mock; no Stripe dependency for dev/E2E
- Accepted members counted via `isNotNull(userId)` — pending invites excluded
- AI-action + card counters resolve org project ids first (IN-subquery), keeping counts org-scoped

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **billing-state.test.ts "usage pass through" test:** my `.not.toBe(usage)` assertion failed because computeBillingState passes the usage reference through unchanged (by design). Removed the over-strict reference-inequality assertion; `toEqual` verifies value passthrough. Fixed before commit — no plan change.
- **commitlint body-max-line-length (100):** first Task 1 commit body had lines >100 chars and was rejected by the commit-msg hook. Rewrapped body lines under 100 chars, committed cleanly.
- **Migration output noise:** `bun --filter @workspace/db migrate` printed a partial error-looking trace (`routine: transformCreateStmt`) but exited 0 with "Migrations completed successfully"; `\d subscription` confirms the table, FK, and unique index all present. No action needed.

## User Setup Required

None - no external service configuration required. Stripe keys optional (BILLING_PROVIDER=mock default).

## Next Phase Readiness

- Ready for **03-02** (billing API): subscription transitions, billing provider, plan-limits service with assertLimit (402 contract), billing routes — all consume PLANS + usage counters + computeBillingState defined here
- Ready for **03-03** (analytics/template API): AnalyticsState type + templateCreateSchema defined here
- Ready for **03-04** (frontend hooks) and **03-07** (E2E): BillingState contract + PLANS limits (2/5/50/500 vs unlimited/25/5000/unlimited) are the fixture/serialization source of truth
- Threat model honored: T-03-01 (limits server-truth), T-03-02 (org-scoped counts), T-03-03 (additive-only migration reviewed before apply), T-03-04/T-03-SC (no network surface, no new packages)

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED
