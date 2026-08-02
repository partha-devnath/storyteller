---
phase: 03-saas-hardening
plan: 05
subsystem: ui
tags:
  [billing, plan-limits, react, tanstack-query, shadcn, zustand, 402, tooltips]

# Dependency graph
requires:
  - phase: 03-saas-hardening
    provides: PLANS config + BillingState/LimitMetric types (03-01), billing API + 402 limit_reached contract (03-02), useBilling/useCheckout/useDowngrade/useUsage hooks + shadcn primitives (03-04)
provides:
  - Billing page (current-plan card, Free/Pro plan grid, usage meters, downgrade dialog) matching UI-SPEC V2
  - handleLimitError shared 402 handler (invalidate billing + destructive toast) wired at 4 mutation sites
  - Disabled New board / Invite / AI generate with limit-tooltip at their plan limits (UI-SPEC V4a)
  - api-client errors now carry HTTP status (402 routing single hook)
  - Local zustand toast store + Toaster (no repo toast existed)
affects: [03-06-onboarding-analytics, 03-07-e2e]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level zustand toast singleton (toast-store) — plain functions like handleLimitError fire toasts without a hook"
    - "Raw-pct (non-rounded) meter fill with 80/100 boundaries on the exact percentages — data-pct carries the raw value"
    - "handleLimitError as the single 402 route: invalidate ['billing', orgId] + exact V4c destructive toast, returns true when handled"

key-files:
  created:
    - apps/web/src/components/usage-meters.tsx
    - apps/web/src/components/plan-cards.tsx
    - apps/web/src/components/plan-change-dialog.tsx
    - apps/web/src/components/billing.tsx
    - apps/web/src/components/toaster.tsx
    - apps/web/src/stores/toast-store.ts
    - apps/web/src/components/__tests__/usage-meters.test.tsx
    - apps/web/src/components/__tests__/plan-cards.test.tsx
    - apps/web/src/components/__tests__/billing.test.tsx
    - apps/web/src/routes/__tests__/projects.test.tsx
  modified:
    - apps/web/src/routes/billing.tsx
    - apps/web/src/hooks/use-billing.ts
    - apps/web/src/lib/api-client.ts
    - apps/web/src/routes/projects.tsx
    - apps/web/src/routes/org-members.tsx
    - apps/web/src/routes/project-chat.tsx
    - apps/web/src/providers/app-provider.tsx
    - apps/web/src/lib/__tests__/api-client.test.ts

key-decisions:
  - "Billing page body lives in components/billing.tsx (Billing export) per the component inventory; routes/billing.tsx keeps the BillingPage export rendering it"
  - "handleLimitError added to use-billing.ts during Task 2 (plan placed it in Task 3) so the Task 2 page honors its own '402 must not show generic message' directive commit-by-commit"
  - "Meter data-pct carries the raw non-rounded percentage (99.8 at 499/500); fill boundaries land exactly on 80 and 100"

patterns-established:
  - "Limit enforcement UI = disabled (never hidden) + limit-tooltip trigger render span, same wrapper as app-shell New board"
  - "Toasts: error = destructive-tinted card, success = neutral card; 4s auto-dismiss"

requirements-completed: [E2E-03]

# Metrics
duration: 12min
completed: 2026-08-02
---

# Phase 3 Plan 5: Billing Page + Plan-Limit Enforcement UI Summary

**Billing page (current-plan card, Free/Pro plan grid with current-plan-badge, usage meters with 80/100 fill-color contract, downgrade dialog), 402-aware api-client, shared handleLimitError routing limit-blocked mutations to the limit banner + destructive toast, and disabled New board / Invite / AI generate actions with limit tooltips — the UI-SPEC V2/V4 slice of SaaS hardening.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-02T19:13:56Z
- **Completed:** 2026-08-02T19:25:24Z
- **Tasks:** 3
- **Files modified:** 18 (10 created, 8 modified)

## Accomplishments

- `UsageMeters` — per-metric meters (projects/members/aiActions/cards) in LIMIT_METRICS order with the raw-pct fill contract: primary <80%, chart-1 at ≥80% <100%, destructive at ≥100%; "Unlimited" + 0-width fill for null limits; "Resets monthly" caption; near-exhausted and limit-reached captions with exact Copywriting Contract strings
- `PlanCards` — Free/Pro grid, exactly one `current-plan-badge` (bg-muted) + `ring-2 ring-primary` on the active tier, tier-correct CTA (Upgrade to Pro → checkout / Downgrade to Free → dialog), "Redirecting…" pending state
- `PlanChangeDialog` — V2d downgrade confirmation with exact dialog copy, Keep Pro (ghost) / Downgrade to Free (destructive), confirm disabled while pending
- `Billing` page body — current-plan card ("Billed monthly", `billing-manage` anchor to portalUrl on pro), skeleton loading, "Couldn't load billing info." + `billing-retry` error banner, checkout/downgrade wiring with success/failure toasts
- `handleLimitError` in use-billing.ts — shared 402 route: invalidates `["billing", orgId]` (shell LimitBanner picks it up) + destructive toast "Limit reached — upgrade to Pro to continue."; returns true when handled so callers skip generic copy
- api-client attaches `err.status` (402 propagates to every mutation error path)
- Disabled actions at limit with `limit-tooltip`: New board (projects), Invite (members), Generate + prompt-input (aiActions) — disabled, never hidden, tooltip anchors preserved
- Local zustand toast store (`toast-store.ts`) + `Toaster` mounted in AppProvider — the repo had no toast wrapper; no new dependencies (threat model T-03-SC forbids installs)
- 16 new tests (5 usage-meters + 4 plan-cards + 4 billing + 2 projects + 1 api-client 402); full suite 53 files / 251 tests pass; repo-wide typecheck 12/12, lint 12/12

## Task Commits

Each task was committed atomically:

1. **Task 1: usage-meters + plan-cards + plan-change-dialog components** - `6d2652f` (feat)
2. **Task 2: Billing page route body + checkout/downgrade wiring + toasts** - `3f147e0` (feat)
3. **Task 3: 402 handling in api-client + disabled actions with limit tooltips** - `f15b23d` (feat)
4. **Lint fix: unused ReactNode import in billing test** - `6d74ed3` (fix)

## Files Created/Modified

- `apps/web/src/components/usage-meters.tsx` - per-metric meters, fill-color contract, warning captions (UsageMeters)
- `apps/web/src/components/plan-cards.tsx` - Free/Pro grid, current-plan-badge, upgrade/downgrade CTAs (PlanCards)
- `apps/web/src/components/plan-change-dialog.tsx` - V2d downgrade confirmation (PlanChangeDialog)
- `apps/web/src/components/billing.tsx` - page body: current-plan + grid + meters + states + checkout/downgrade (Billing)
- `apps/web/src/routes/billing.tsx` - BillingPage renders the Billing component (replaces 03-04 stub)
- `apps/web/src/components/toaster.tsx` - fixed-position toast viewport (success/error styling)
- `apps/web/src/stores/toast-store.ts` - zustand toast store + module-level `toast` + useToast
- `apps/web/src/hooks/use-billing.ts` - + handleLimitError (402 → invalidate billing + destructive toast)
- `apps/web/src/lib/api-client.ts` - thrown errors carry `err.status`
- `apps/web/src/routes/projects.tsx` - New board disabled + limit-tooltip; 402 catch on createProject
- `apps/web/src/routes/org-members.tsx` - Invite disabled + limit-tooltip; 402 catch on invite
- `apps/web/src/routes/project-chat.tsx` - Generate/textarea disabled at aiActions limit + tooltip; 402 catch on generate/clarify
- `apps/web/src/providers/app-provider.tsx` - Toaster mounted
- Test files: usage-meters.test.tsx, plan-cards.test.tsx, billing.test.tsx, projects.test.tsx, api-client.test.ts

## Decisions Made

- Billing page body implemented as a `Billing` component in `components/billing.tsx` (UI-SPEC component inventory), with the route keeping the `BillingPage` export — satisfies both the Task 2 route body directive and the component inventory
- `handleLimitError` landed in use-billing.ts during Task 2 (plan scheduled it for Task 3) — the Task 2 page's own "402 must not show the generic message" directive required it; Task 3 then consumed it at the three page mutation sites
- Meter `data-pct` carries the raw non-rounded percentage so 80/100 boundary assertions land exactly (99.8 at 499/500 stays 99.8)
- `portalUrl` anchor only renders when `plan === "pro" && portalUrl` — a pro org without a portal URL renders no dead link

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] No toast wrapper existed in the repo; plan assumed one**

- **Found during:** Task 1 (read_first: "grep toast in apps/web/src and reuse that exact wrapper")
- **Issue:** `grep -r "toast"` over apps/web/src returned nothing — no toast component, hook, or dependency existed, yet Tasks 2-3 acceptance criteria require toasts ("Toasts use the existing repo toast wrapper", downgrade success/failure toasts, V4c destructive toast).
- **Fix:** Added a minimal local zustand toast store (`stores/toast-store.ts`: `toast.success`/`toast.error` module API + `useToast` hook) and a `Toaster` viewport component mounted in `app-provider.tsx`. No new npm dependencies — honors threat model T-03-SC (no installs in this plan) and the repo's zustand global-state convention.
- **Files modified:** apps/web/src/stores/toast-store.ts, apps/web/src/components/toaster.tsx, apps/web/src/providers/app-provider.tsx
- **Verification:** billing.tsx `useToast` import matches the new wrapper; all toast-using tests pass
- **Committed in:** 6d2652f (Task 1)

**2. [Rule 3 - Blocking] `bun --filter web test` broken repo-wide (pre-existing)**

- **Found during:** Tasks 1-3 (`<verify>` commands)
- **Issue:** `bun --filter web test` bypasses the root vitest config → no jsdom → 18 files fail. Pre-existing, documented in 02-02/03-04 summaries.
- **Fix:** Used `bun run test` from the repo root (the plan's `<verify>` command run as its functional equivalent) — matches the established convention from prior waves.
- **Verification:** full suite 53 files / 251 tests pass
- **Committed in:** n/a (verification method)

**3. [Rule 1 - Bug] Plan's Task 1 test spec contradicted the UI-SPEC fill contract**

- **Found during:** Task 1 (writing usage-meters tests)
- **Issue:** Plan test spec: free limits {2,5,50,500} + usage {1,2,40,499} → "each bar data-pct (50/40/80/99.8), **no warnings**". But per UI-SPEC V2c, 40/50 = 80% is ≥80 (chart-1 + "nearly exhausted" warning) and 499/500 = 99.8% is ≥80 (warning too). A "no warnings" case cannot contain an 80% or 99.8% value.
- **Fix:** Implemented the component to the UI-SPEC/component-spec contract (authoritative) and wrote tests asserting real boundaries: under-80 case uses 39/50 (no warnings, all primary), separate cases assert 80% → chart-1 + warning and 99.8% → chart-1 + warning, 100% → destructive + limit copy.
- **Files modified:** apps/web/src/components/**tests**/usage-meters.test.tsx
- **Verification:** 5/5 usage-meters tests pass
- **Committed in:** 6d2652f (Task 1)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 blocking, 1 bug)
**Impact on plan:** All fixes required for plan completion (toasts were a hard acceptance criterion), correct verification, and contract-accurate tests. No scope creep — toast infra is dependency-free and ~80 lines.

## Issues Encountered

- commitlint `body-max-line-length` (100 chars) rejected the Task 2 commit body on first attempt — body rewritten to short lines and committed cleanly.
- `handleLimitError` was scheduled for Task 3 but Task 2's page needed it; pulled forward one task so every commit stays green (documented under Decisions).

## Known Stubs

None. `portalUrl`/`checkoutUrl` render nothing when null (server-truth display, not stubs).

## Threat Flags

| Flag                              | File                                | Description                                                                                                                                                                          |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| threat_flag: client_toast_surface | apps/web/src/components/toaster.tsx | New client-only UI surface (fixed-position viewport). No network, no storage, no external input — renders strings from the zustand store only. Accepted risk; no server interaction. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 03-06 (onboarding + analytics):** billing page complete; analytics page body still stubbed; onboarding body stubbed (03-04 guard active)
- **Ready for 03-07 (E2E):** all B1/B2/B3 visual anchors exist — current-plan, billing-manage, plan-grid, plan-card-free/pro, plan-select-pro/free, current-plan-badge, usage-section, usage-meter/bar/value-{metric} (+data-pct), plan-change-dialog/confirm/cancel, billing-retry, limit-tooltip; limit-banner/limit-banner-upgrade from 03-04
- Threat model honored: T-03-40 (UI disable is UX; server assertLimit is enforcement — 402 path invalidates billing so banner reflects truth), T-03-41 (checkout only navigates to server-returned URL via useCheckout), T-03-42 (billing payload display-only, org-scoped), T-03-43 (banner from server data, self-heals on invalidation), T-03-SC (no installs)

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 10 created files verified present on disk (`[ -f ]`)
- All 4 commits verified in git log: 6d2652f, 3f147e0, f15b23d, 6d74ed3
- Full suite: `bun run test` → 53 files / 251 tests pass
- `bun run typecheck` → 12/12 tasks pass; `bun run lint` → 12/12 tasks pass
- grep: limit-tooltip present in projects/org-members/project-chat (≥1 each); `err.status = response.status` in api-client; exact V4c toast copy in use-billing.ts
