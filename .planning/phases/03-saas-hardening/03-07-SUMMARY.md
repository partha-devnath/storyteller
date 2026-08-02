---
phase: 03-saas-hardening
plan: 07
subsystem: testing
tags:
  [
    e2e,
    playwright,
    billing,
    plan-limits,
    onboarding,
    analytics,
    seed,
    mock-providers,
  ]

# Dependency graph
requires:
  - phase: 03-saas-hardening
    provides: subscription table + PLANS + usage counters (03-01), billing API + mock provider + assertLimit 402 (03-02), analytics + template API (03-03), frontend hooks + app-shell + first-run guard (03-04), billing page + limit-tooltip anchors (03-05), onboarding + analytics UI with O1/A1 anchors (03-06)
provides:
  - Phase 3 E2E fixtures: over-limit free org (2 projects / 5 members / 50 proposals this month, no subscription row), pro org (subscription plan pro), activity rows in E2E_ORG_ID (2 cards / 2 approved proposals / 3 comments with explicit within-30-day timestamps), fresh users TEST_USER_C/TEST_USER_D (zero orgs, zero projects)
  - apps/e2e/src/saas.test.ts with test.describe.serial("phase 3"): B1 billing page, B2 plan-limit enforcement, B3 downgrade, O1 onboarding, A1 analytics — all 5 journeys green
  - Fix: rate limiter buckets isolated per route instance (shared IP bucket caused 429 mid-suite)
  - Fix: phase 1/2 e2e adapted to the 03-04 onboarding first-run guard
affects: [03-08-deploy, verification, milestone archive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Serial phase describe block with a shared signIn helper (context.clearCookies + landing regex) — each journey signs in fresh for determinism"
    - "Deterministic fixture orgs via fixed UUIDs (FREE_ORG_ID/PRO_ORG_ID) exported from seed.ts — journeys build URLs/API calls against known ids"
    - "page.request shares the signed-in browser context's session for server-truth spot-checks (402 limit_reached, org creation)"
    - "Activity fixtures carry explicit createdAt/approvedAt timestamps (daysAgo) — analytics totals/series are deterministic within the 30d window"

key-files:
  created:
    - apps/e2e/src/saas.test.ts
  modified:
    - apps/e2e/src/seed.ts
    - apps/api/src/middleware/rate-limit.ts
    - apps/e2e/src/core-loop.test.ts

key-decisions:
  - "TEST_USER_C/D seeded with NO orgs (per plan) — the O1 journey creates an org via POST /api/orgs mid-flow (same pattern as the A1 empty-org case) so the blank-template project has an org to live in; the 'Welcome to Storyteller' base copy is asserted before the org exists"
  - "Activity cards live in a second E2E_ORG_ID project (Activity Project) so the graph fixture's exact 7-node count keeps phase-2 J1 green"
  - "B2 drives org selection through the org switcher (the /orgs/:orgId/projects route does not exist) — the limit-banner-upgrade URL assertion proves the switcher selected FREE_ORG_ID"
  - "Rate limiter store moved per-instance: the shared IP bucket collapsed auth+ai+billing traffic into one window, so the billing route's 10/60s budget was consumed by get-session/sign-in calls and the downgrade POST 429'd"

patterns-established:
  - "B1 asserts the deterministic mock-checkout redirect (waitForURL) as the upgrade contract — the transient 'Redirecting…' button state is too fast to assert against the instant mock provider"
  - "Meter assertions parse the data-pct attribute rather than asserting fill visibility — a 0% fill has a zero-width box and reports hidden"

requirements-completed: [E2E-03]

# Metrics
duration: 34min
completed: 2026-08-02
---

# Phase 3 Plan 7: Phase 3 E2E Journeys Summary

**Five Playwright journeys (B1 billing page, B2 plan-limit enforcement, B3 downgrade, O1 onboarding, A1 analytics) over deterministic Phase 3 seed fixtures (over-limit free org, pro org, 30-day activity rows, fresh users) — full E2E-03 acceptance: all 17 tests green (5 smoke + 4 core-loop + 3 phase-2 + 5 phase-3) against the isolated test DB with AI_PROVIDER=mock + BILLING_PROVIDER=mock.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-08-02T19:58:55Z
- **Completed:** 2026-08-02T20:32:44Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `seed.ts` Phase 3 fixtures: FREE_ORG_ID over-limit free org (exactly 2 projects, 5 accepted members, 50 proposals this calendar month, 5 cards, **no subscription row** — free-default path), PRO_ORG_ID pro org (subscription row plan `pro`/`active`, 1 board, 3 cards), E2E_ORG_ID activity rows (2 cards 3/10 days ago, 2 approved proposals approvedAt 5/15 days ago, 3 comments 2/8/12 days ago), fresh users TEST_USER_C + TEST_USER_D (zero orgs, zero projects) — all inserted in `seedPhase3Fixtures()` after the graph fixture
- `saas.test.ts` `test.describe.serial("phase 3")`:
  - **B1** — current-plan "Free" + current-plan-badge on plan-card-free, plan-select-pro visible, all four usage meters parse `data-pct` >= 0, upgrade click redirects to the mock provider's `/mock-checkout` URL, state unchanged on return
  - **B2** — org switcher selects Over Limit Org → limit-banner with `data-limit-metric="projects"` + exact copy, New board disabled + limit-tooltip, banner CTA navigates to `/orgs/FREE_ORG_ID/billing`, usage-bar-projects + usage-bar-aiActions `data-pct="100"` with destructive caption, full-reload server truth, and a `page.request` POST /api/projects asserting 402 `code: limit_reached`
  - **B3** — pro org billing shows Pro + plan-select-free; dialog cancel closes with no change; confirm fires the downgrade, success toast "You're now on the Free plan.", useDowngrade invalidation flips current-plan to Free with the badge on the free card
  - **O1** — fresh users (zero orgs/projects) land on /onboarding with "Welcome to Storyteller"; blank template creates a board and navigates to it; second fresh user skips and stays on /projects with no re-redirect in a 2s settle window
  - **A1** — seeded activity org shows 4 stat cards > 0 and 3 SVG charts with >= 1 `data-value` bar each; a brand-new org (created via page.request) shows analytics-empty-cta which navigates to /projects
- **Full E2E suite green:** `bun --filter e2e test` → 17 passed (52s): smoke ×5, core-loop J1-J4, phase-2 J1-J3, phase-3 B1/B2/B3/O1/A1. e2e typecheck + lint pass; api typecheck passes; 75 API unit tests pass after the rate-limiter fix.

## Task Commits

Each task was committed atomically (deviation fixes committed separately with `fix(03-07)`):

1. **Task 1: Phase 3 seed fixtures** - `ef2a429` (feat)
2. **Task 2: B1 billing + B2 plan-limit journeys** - `8019898` (feat)
3. **Deviation: rate limiter per-route buckets** - `a1f0d69` (fix)
4. **Deviation: phase 1/2 e2e onboarding adaptation** - `f7893f6` (fix)
5. **Task 3: B3 downgrade + O1 onboarding + A1 analytics journeys** - `516a7d5` (feat)

**Plan metadata:** final docs commit (SUMMARY + STATE/ROADMAP/REQUIREMENTS) — see git log

## Files Created/Modified

- `apps/e2e/src/seed.ts` - + TEST_USER_C/D (+ids), FREE_ORG_ID, PRO_ORG_ID, seedPhase3Fixtures (over-limit org, pro org, activity rows, fresh users), insertCard helper
- `apps/e2e/src/saas.test.ts` - new `test.describe.serial("phase 3")` with B1/B2/B3/O1/A1 (5 journeys)
- `apps/api/src/middleware/rate-limit.ts` - rateLimiter store moved per-instance (per-route per-IP windows)
- `apps/e2e/src/core-loop.test.ts` - J1 onboarding dismissal + onboarding-aware signIn + signupViaUi landing regex

## Decisions Made

- TEST_USER_C/D seeded with **no orgs** (per Task 1); the O1 journey creates an org via `POST /api/orgs` mid-flow (pattern the plan itself sanctions for A1's empty org) and reloads so `useOrgs` picks it up — preserves both the "Welcome to Storyteller" base copy (asserted before the org exists) and a working blank-template project creation. The plan's "NO orgs" seed and its own O1 "blank creates a project" criterion are mutually exclusive (POST /api/projects 403s without org membership); the must-have truth "fresh user (zero projects) → onboarding → blank creates a board" is fully honored.
- Activity cards placed in a second E2E_ORG_ID project ("Activity Project") — the graph fixture's exact 7-node/7-edge assertions (phase-2 J1) must stay green.
- B2 drives org selection via the org switcher (the org-scoped `/orgs/:orgId/projects` route does not exist; the plan anticipated the switcher). The limit-banner-upgrade URL assertion proves the correct org is selected.
- B1 asserts the deterministic `/mock-checkout` redirect as the upgrade contract; the transient "Redirecting…" state is not asserted (instant mock provider).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shared rate-limiter IP bucket caused 429 mid-suite**

- **Found during:** Task 3 (B3 full-suite run)
- **Issue:** `rateLimitStore` was module-level, keyed by IP only — every `rateLimiter()` instance shared one bucket. The first request set the window; billing's 10/60s limiter then blocked once ANY route's traffic (auth get-session ×3 tests + sign-ins + checkout) pushed the shared count to 10. B3's downgrade POST returned 429 → no success toast → test failed. Solo B3 passed (count 1); sequence failed (count ≥ 10) — a pre-existing 03-02 bug first exercised by these journeys.
- **Fix:** Moved the store inside `rateLimiter()` so each route instance owns its per-IP window — auth 500/60s, ai 100/60s, billing 10/60s, webhook 60/60s, upload 10/60s are now independent, matching the documented per-route limits.
- **Files modified:** apps/api/src/middleware/rate-limit.ts
- **Verification:** 75 API unit tests pass; full e2e suite (17) green
- **Committed in:** a1f0d69

**2. [Rule 3 - Blocking] 03-04 onboarding first-run guard broke phase 1/2 e2e**

- **Found during:** Task 3 (full-suite run, first since 03-04 shipped the guard)
- **Issue:** core-loop J1 (fresh signup user, zero projects) and J4 (TEST_USER_B, zero projects) are redirected to /onboarding by the 03-04 guard; both expected the legacy /projects landing. The full e2e suite had not been run since the guard landed, so the breakage was dormant.
- **Fix:** core-loop J1 dismisses onboarding after signup (start → skip, deterministic via toBeVisible waits); the core-loop `signIn` helper branches on the landing URL and skips onboarding for zero-project users (project-having users unaffected); signupViaUi's landing regex accepts /onboarding.
- **Files modified:** apps/e2e/src/core-loop.test.ts
- **Verification:** full suite 17/17 green
- **Committed in:** f7893f6

**3. [Rule 1 - Bug] B1 usage-bar visibility assertion failed on 0% fills**

- **Found during:** Task 2 (first B1 run)
- **Issue:** `expect(usage-bar-aiActions).toBeVisible()` failed — a 0% fill div has a zero-width box and Playwright reports it hidden.
- **Fix:** Assert the meter wrapper (`usage-meter-{metric}`) is visible and parse the bar's `data-pct` attribute (the contract anchor) for a number >= 0.
- **Files modified:** apps/e2e/src/saas.test.ts
- **Verification:** B1 passes
- **Committed in:** 8019898

**4. [Rule 1 - Bug] O1 blank-template click landed on the wrapper, not the button**

- **Found during:** Task 3 (O1 run)
- **Issue:** `onboarding-template-blank` is the wrapper div testid (per 03-06's "testid prop passed via parent wrapper"); clicking its center hits the card body — the mutation never fired.
- **Fix:** Click `getByRole("button", { name: "Use template" })` inside the wrapper.
- **Files modified:** apps/e2e/src/saas.test.ts
- **Verification:** O1 blank-template navigates to /projects/untitled-board
- **Committed in:** 516a7d5

**5. [Rule 1 - Bug] O1 second sign-in stuck on /login (session cookie persisted)**

- **Found during:** Task 3 (O1 run)
- **Issue:** After the blank-template journey, TEST_USER_C was still signed in; `page.goto("/login")` redirected to /dashboard (PublicRoute) so the login form never rendered.
- **Fix:** signIn helper calls `page.context().clearCookies()` first — deterministic across multi-user journeys.
- **Files modified:** apps/e2e/src/saas.test.ts
- **Verification:** O1 skip path passes
- **Committed in:** 516a7d5

---

**Total deviations:** 5 auto-fixed (2 blocking, 3 bugs)
**Impact on plan:** All fixes required for the plan's own acceptance criteria (full suite green, deterministic journeys). The rate-limiter and onboarding fixes correct pre-existing defects exposed by the first full-suite run since 03-04; the three test-side fixes were assertion/click correctness. No scope creep — no new features, deps, or schema changes.

## Issues Encountered

- **Stale dev servers (environmental):** a prior session left `bun run dev` processes on ports 3001/5173. Playwright's `reuseExistingServer` reused them, hitting an old dropped test DB → logins failed (smoke sign-in failed identically, confirming it was environmental, not the seed). Killed both PIDs; fresh webServers per run since. Not committed (no code change).
- **E2E runs need `DATABASE_URL` exported** in the shell (playwright config reads it for `SOURCE_DATABASE_URL`); `.env` files are gitignored and not auto-loaded by the runner.
- commitlint body line-length (100) — commit bodies written short; lint-staged prettier reformatted staged files on every commit (auto-fixed, re-staged, clean).

## Known Stubs

None. The mock billing provider /mock-checkout redirect is the deterministic test path (BILLING_PROVIDER=mock), not a stub.

## Threat Flags

| Flag                                | File                                  | Description                                                                                                                                                                                                                                                                |
| ----------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| threat_flag: rate_limiter_semantics | apps/api/src/middleware/rate-limit.ts | Behavior change (not new surface): per-route rate buckets replace the shared IP bucket. Request volume limits per route unchanged (10/60s billing, 60/60s webhook, 500/60s auth in e2e); the fix only stops cross-route budget sharing. No new endpoints, no auth changes. |

## User Setup Required

None - no external service configuration required. E2E runs entirely in mock mode (AI_PROVIDER=mock + BILLING_PROVIDER=mock); docker postgres + mailpit are the only infra.

## Next Phase Readiness

- **E2E-03 verified:** all five Phase 3 journeys pass against the isolated test DB, proving the UI-SPEC testid anchor contract end to end (billing selectable, limits enforced, downgrade flips plans, onboarding + analytics reachable) and the server-truth limit path (402 limit_reached)
- **Full regression green:** 17/17 e2e (phases 1-3) + 75 API tests + web/unit suites — safe baseline for milestone archive and the deploy verification in 03-08
- Phase 3 complete: all 8 plans done — ready for milestone-level verification (`/gsd-verify-work`) and archive (`/gsd-complete-milestone`)

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 4 code files verified present on disk (`[ -f ]`)
- All 5 task/deviation commits verified in git log: `ef2a429`, `8019898`, `a1f0d69`, `f7893f6`, `516a7d5`
- `bun --filter e2e typecheck` + `lint` pass; `bun --filter api typecheck` passes
- Full e2e suite: `bun --filter e2e test` → **17 passed** (5 smoke + 4 core-loop + 3 phase-2 + 5 phase-3), final run on committed state 52.4s
- 75 API unit tests pass after the rate-limiter fix
- Acceptance criteria re-verified: seed exports FREE_ORG_ID/PRO_ORG_ID, seedPhase3Fixtures inside seedTestData; `daysAgo` date constants grepped in seed; B1/B2/B3/O1/A1 all green; plan-level `<verification>` commands executed successfully
