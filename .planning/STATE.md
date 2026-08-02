---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: verifying
stopped_at: Completed 03-07-PLAN.md
last_updated: "2026-08-02T20:35:39.634Z"
last_activity: 2026-08-02 -- Phase 3 P06 completed
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# STATE.md

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-08-02)

**Core value:** Business folks can describe an idea in natural language and get a clean, consistent, non-contradictory requirements board that AI keeps in sync — closed cards freeze, nothing is lost, every change is approved and auditable.

**Current focus:** Phase 3 — SaaS Hardening

## Current Status

- Milestone v1.0 (Template Release): Complete
- Milestone v2.0 (Living Requirements Board): Phase 1 + Phase 2 complete
- Phase 1 (Core Loop): **Complete** — all 8 plans; E2E-01 verified
- Phase 2 (Graph & Collaboration): **Complete** — all 5 plans; E2E-02 verified (12/12 E2E journeys pass)
- Phase 3 (SaaS Hardening): **Executing** — 6 of 8 plans complete

## Recent Work

- Phase 3 P01 (billing data layer): subscription table migrated, PLANS config, usage counters, computeBillingState.
- Phase 3 P02 (billing API): stripe@22.4.0 installed (human-vetted), BillingProvider (stripe+mock), subscription transitions, assertLimit wired at 7 mutation sites (402 limit_reached), billing + webhook routes, shared rate limiter extracted.
- Phase 3 P03 (analytics/template API): getAnalytics org-scoped 30d aggregation (totals + daily series + activeMembers), PRODUCT_LAUNCH_TEMPLATE seeder (2 epics / 6 cards, atomic transaction), GET /:id/analytics + POST /:id/projects/template routes mounted, 75 tests green.
- Phase 3 P04 (frontend foundation): 6 shadcn primitives, use-billing/use-analytics/use-onboarding hooks, app-shell wiring (nav-billing/nav-analytics, env-indicator, limit-banner, disabled New board), first-run onboarding redirect.
- Phase 3 P05 (billing page): Billing page body (current-plan, plan grid, usage meters, downgrade dialog), 402-aware api-client + handleLimitError, disabled limit actions with tooltips, local toast store.
- Phase 3 P06 (onboarding + analytics UI): 2-step onboarding flow (blank + product-launch template + session skip), analytics dashboard (4 stat cards + 3 custom SVG bar charts + empty/error states), all O1/A1 E2E anchors in place.

## Next Actions

1. Phase 3 (SaaS hardening) — billing, plan limits, onboarding, analytics, deployment polish. Plan with `/gsd-plan-phase 3`.
2. After Phase 3, archive milestone v2.0 via `/gsd-complete-milestone`.

## Blockers

None.

## Notes

- E2E uses the mock AI provider (`AI_PROVIDER=mock`) for deterministic tests.
- E2E infra requires docker postgres + mailpit (`docker compose up -d postgres mailpit`).
- The graph view, SSE, comments/mentions, and export are all shippable; billing deferred to Phase 3.

## Current Position

Phase: 3 (SaaS Hardening) — EXECUTING
Plan: 8 of 8
Status: Phase complete — ready for verification
Last activity: 2026-08-02 -- Phase 3 P06 completed

## Performance Metrics

| Phase                       | Plan  | Duration | Notes    |
| --------------------------- | ----- | -------- | -------- |
| Phase 03-saas-hardening P01 | 4min  | 3 tasks  | 12 files |
| Phase 03-saas-hardening P02 | 9min  | 3 tasks  | 21 files |
| Phase 03-saas-hardening P03 | 7min  | 3 tasks  | 8 files  |
| Phase 03-saas-hardening P04 | 14min | 3 tasks  | 27 files |
| Phase 03-saas-hardening P05 | 12min | 3 tasks  | 18 files |
| Phase 03-saas-hardening P06 | 12min | 2 tasks  | 8 files  |
| Phase 03-saas-hardening P08 | 13min | 3 tasks  | 5 files  |
| Phase 03-saas-hardening P07 | 34min | 3 tasks  | 4 files  |

## Decisions

- [Phase 03-01]: PLANS limits/prices are compile-time constants in @workspace/schemas (server source of truth); API never accepts client-supplied limits — T-03-01 mitigation; UI-SPEC V2b contract
- [Phase 03-01]: BILLING_PROVIDER defaults to mock; Stripe env vars optional so dev/E2E run without real Stripe keys — Mirrors AI_PROVIDER=mock; deterministic E2E
- [Phase 03-01]: countAcceptedMembers counts only rows with userId (isNotNull); pending invites (userId null) excluded — Pending invites do not consume members limit
- [Phase 03-02]: stripe@22.4.0 pinned exact after blocking-human gate approval (owner Stripe, MIT, 15.7M weekly downloads, 0 OSV vulns, no install scripts)
- [Phase 03-02]: assertLimit placed after input validation but BEFORE the AI provider call in ai routes — blocks over-limit orgs before burning tokens
- [Phase 03-02]: Webhook events normalized into SubscriptionEvent and funneled through pure mapSubscriptionEventToState so stripe + mock share one testable transition path
- [Phase 03-02]: current_period_end read defensively (stripe v22 generated types omit it from Subscription/Session interfaces)
- [Phase 03-03]: Route params named :id (not :orgId) to match requireOrg's param("id") fallback — URL shape /api/orgs/{orgId}/analytics unchanged (03-02 convention)
- [Phase 03-03]: Template seeding wrapped in db.transaction — partial seeds would leave orphaned epics/cards; atomicity is a correctness requirement
- [Phase 03-03]: activeMembers computed as JS Set union of two selectDistinct queries — deterministic, org-scoped by construction
- [Phase 03-03]: Empty-org analytics returns zeroed 30-bucket series (not []) — V5c empty state checks all-zero; chart shape stays constant
- [Phase 03-04]: useCheckout redirects via window.location.href to the hosted checkout URL — no Stripe.js in the web bundle (UI-SPEC V2b)
- [Phase 03-04]: useUsage exposes isAtLimit/pct as the single derived source for meters/banner/disabled actions (03-05 consumes it directly)
- [Phase 03-04]: First-run detection fans out useQueries over orgs reusing the ["projects", orgId] cache — no duplicate network fetches
- [Phase 03-04]: Onboarding skip is session-scoped (sessionStorage), matching UI-SPEC V3 "Skip dismisses for the session"
- [Phase 03-saas-hardening]: Billing page body lives in components/billing.tsx (Billing export) per the component inventory; routes/billing.tsx keeps the BillingPage export rendering it
- [Phase 03-saas-hardening]: handleLimitError added to use-billing.ts during Task 2 (plan placed it in Task 3) so the Task 2 page honors its own '402 must not show generic message' directive commit-by-commit
- [Phase 03-saas-hardening]: Meter data-pct carries the raw non-rounded percentage (99.8 at 499/500); fill boundaries land exactly on 80 and 100
- [Phase 03-saas-hardening]: Toasts use a local zustand store (toast-store.ts) - repo had no toast wrapper; module-level toast singleton lets plain functions (handleLimitError) fire toasts without a hook; no new deps per T-03-SC
- [Phase 03-saas-hardening]: BarChart fill uses an explicit FILLS map with literal var(--chart-1/2/3) strings, not a var(--${colorVar}) template literal — keeps the token-only fill contract greppable per the acceptance criterion
- [Phase 03-saas-hardening]: Template card testids live on wrapper divs in onboarding.tsx ("data-testid prop passed via parent wrapper") — TemplateCard stays generic, the route owns the O1 anchors
- [Phase 03-saas-hardening]: Welcome heading falls back to "Welcome to {orgName}" when the user has orgs (zero-project first-run state), else "Welcome to Storyteller"
- [Phase 03-saas-hardening]: Chart bar metric derived from the svg testid (analytics-chart-{metric} → analytics-bar-{metric}-{index}) — one prop drives both anchor namespaces
- [Phase ?]: VITE_APP_ENV baked at build time (default production) — runner serves static dist, runtime env too late; staging builds pass VITE_APP_ENV=staging to render the env badge
- [Phase 03-08]: CI e2e job provisions gitignored .env files from .env.example — API needs EMAIL_PROVIDER=mailpit (mailpit-API journeys), web needs VITE_API_URL
- [Phase 03-08]: API Dockerfile copies apps/e2e/package.json so workspace set matches bun.lock — keeps --frozen-lockfile reproducible builds (pre-existing frozen-install failure fixed)
- [Phase 03-saas-hardening]: Phase 3 E2E (03-07): deterministic fixture orgs via fixed UUIDs (FREE_ORG_ID/PRO_ORG_ID) exported from seed.ts; O1 creates an org via POST /api/orgs mid-flow because the plan's 'NO orgs' seed and its blank-template criterion are mutually exclusive (POST /api/projects 403s without org membership); activity cards live in a second E2E_ORG_ID project so the graph fixture's exact 7-node count stays green; B2 drives org selection via the org switcher since /orgs/:orgId/projects does not exist as a route. — Deterministic E2E that keeps phase 1/2 journeys green and honors the plan's must-have truths (fresh user = zero projects; blank creates a board; over-limit org proven via banner + meters + 402).

## Last Session

Last session: 2026-08-02T20:35:39.621Z
Last Date: 2026-08-02T20:35:39.621Z
Stopped At: Completed 03-07-PLAN.md
Resume File: None
