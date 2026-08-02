---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: executing
last_updated: "2026-08-02T18:41:06.217Z"
last_activity: 2026-08-02 -- Phase 3 execution started
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 21
  completed_plans: 15
  percent: 67
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
- Phase 3 (SaaS Hardening): **Executing** — 2 of 8 plans complete

## Recent Work

- Phase 3 P01 (billing data layer): subscription table migrated, PLANS config, usage counters, computeBillingState.
- Phase 3 P02 (billing API): stripe@22.4.0 installed (human-vetted), BillingProvider (stripe+mock), subscription transitions, assertLimit wired at 7 mutation sites (402 limit_reached), billing + webhook routes, shared rate limiter extracted.

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
Plan: 3 of 8
Status: Ready to execute
Last activity: 2026-08-02 -- Phase 3 P02 completed

## Performance Metrics

| Phase                       | Plan | Duration | Notes    |
| --------------------------- | ---- | -------- | -------- |
| Phase 03-saas-hardening P01 | 4min | 3 tasks  | 12 files |
| Phase 03-saas-hardening P02 | 9min | 3 tasks  | 21 files |
| Phase 03-saas-hardening P02 | 9min | 3 tasks  | 21 files |

## Decisions

- [Phase 03-01]: PLANS limits/prices are compile-time constants in @workspace/schemas (server source of truth); API never accepts client-supplied limits — T-03-01 mitigation; UI-SPEC V2b contract
- [Phase 03-01]: BILLING_PROVIDER defaults to mock; Stripe env vars optional so dev/E2E run without real Stripe keys — Mirrors AI_PROVIDER=mock; deterministic E2E
- [Phase 03-01]: countAcceptedMembers counts only rows with userId (isNotNull); pending invites (userId null) excluded — Pending invites do not consume members limit
- [Phase 03-02]: stripe@22.4.0 pinned exact after blocking-human gate approval (owner Stripe, MIT, 15.7M weekly downloads, 0 OSV vulns, no install scripts)
- [Phase 03-02]: assertLimit placed after input validation but BEFORE the AI provider call in ai routes — blocks over-limit orgs before burning tokens
- [Phase 03-02]: Webhook events normalized into SubscriptionEvent and funneled through pure mapSubscriptionEventToState so stripe + mock share one testable transition path
- [Phase 03-02]: current_period_end read defensively (stripe v22 generated types omit it from Subscription/Session interfaces)

## Session

- Last session: 2026-08-02T18:39:12Z
- Last Date: 2026-08-02T18:39:12Z
- Stopped At: Completed 03-02-PLAN.md
- Resume File: None
