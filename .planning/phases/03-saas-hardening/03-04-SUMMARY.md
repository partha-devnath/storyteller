---
phase: 03-saas-hardening
plan: 04
subsystem: ui
tags:
  [
    frontend,
    shadcn,
    tanstack-query,
    billing,
    onboarding,
    analytics,
    hooks,
    react,
  ]

# Dependency graph
requires:
  - phase: 03-saas-hardening
    provides: PLANS config + BillingState/AnalyticsState types (03-01), billing API GET/POST routes + 402 contract (03-02)
provides:
  - 6 shadcn primitives (skeleton, alert, dialog, select, table, progress) from the official registry
  - use-billing.ts hooks (useBilling/useCheckout/useDowngrade/useUsage) against the BillingState contract
  - use-analytics.ts (30d analytics query) + use-onboarding.ts (first-run detection, sessionStorage skip)
  - app-shell additions: Billing/Analytics nav links, EnvIndicator staging pill, LimitBanner, New-board disable with tooltip
  - First-run onboarding redirect guard in protected-route.tsx
  - Route stubs for /onboarding, /orgs/:orgId/billing, /orgs/:orgId/analytics
affects: [03-05-billing-page, 03-06-onboarding-analytics, 03-07-e2e]

# Tech tracking
tech-stack:
  added:
    - "6 shadcn v4 + Base UI primitives from official registry (skeleton, alert, dialog, select, table, progress)"
  patterns:
    - "Hook contracts defined before page surfaces — interface-first wiring against the UI-SPEC API contract"
    - "useUsage derived selector (isAtLimit/pct) as the single source for meters/banner/disabled actions"
    - "useQueries fan-out per org for first-run project counting, reusing the ['projects', orgId] cache"
    - "sessionStorage skip key for onboarding (per-session dismissal, no data change)"

key-files:
  created:
    - apps/web/src/hooks/use-billing.ts
    - apps/web/src/hooks/use-analytics.ts
    - apps/web/src/hooks/use-onboarding.ts
    - apps/web/src/components/env-indicator.tsx
    - apps/web/src/components/limit-banner.tsx
    - apps/web/src/routes/onboarding.tsx
    - apps/web/src/routes/billing.tsx
    - apps/web/src/routes/analytics.tsx
    - apps/web/src/hooks/__tests__/use-billing.test.tsx
    - apps/web/src/components/__tests__/env-indicator.test.tsx
    - apps/web/src/components/__tests__/limit-banner.test.tsx
    - packages/ui/src/components/{skeleton,alert,dialog,select,table,progress}.tsx
  modified:
    - apps/web/src/App.tsx
    - apps/web/src/components/app-shell.tsx
    - apps/web/src/components/protected-route.tsx
    - apps/web/src/components/__tests__/app-shell.test.tsx
    - apps/web/src/components/__tests__/protected-route.test.tsx
    - packages/ui/src/components/button.tsx

key-decisions:
  - "useCheckout redirects via window.location.href to the hosted checkout URL — no Stripe.js in the bundle (UI-SPEC V2b)"
  - "useUsage pct returns 100 for null/unlimited limits and clamps at 100 — drives meter fill colors in 03-05"
  - "First-run detection fans out useQueries over orgs reusing the ['projects', orgId] cache — no duplicate fetches"
  - "Onboarding skip key in sessionStorage so a returning zero-project user is re-directed next session (UI-SPEC V3)"

patterns-established:
  - "Interface-first: hooks + testid anchors defined in this plan are the contracts 03-05/03-06 pages build against"
  - "Test files use .tsx extension when they contain JSX (vitest esbuild rejects JSX in .ts)"

requirements-completed: [E2E-03]

# Metrics
duration: 14min
completed: 2026-08-02
---

# Phase 3 Plan 4: Frontend Foundation — Hooks + Shell Wiring Summary

**6 shadcn primitives, three UI contract hooks (useBilling/useAnalytics/useOnboarding), app-shell additions (Billing/Analytics nav, staging env pill, over-limit banner, disabled New board), and the first-run onboarding redirect — the interface-first foundation 03-05/03-06 pages build against.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-02T18:41:00Z
- **Completed:** 2026-08-02T18:55:22Z
- **Tasks:** 3
- **Files modified:** 27 (21 created, 6 modified)

## Accomplishments

- 6 shadcn primitives installed from the official registry (skeleton, alert, dialog, select, table, progress); dialog's registry refresh of button.tsx lint-regressed and was re-fixed
- use-billing.ts: useBilling (query key `["billing", orgId]`), useCheckout (POST → window.location.href redirect), useDowngrade (POST → invalidate), useUsage derived selectors (isAtLimit/pct) exporting UsageView
- use-analytics.ts: 30d-range analytics query keyed `["analytics", orgId]`
- use-onboarding.ts: needsOnboarding (zero projects across ALL orgs), dismissOnboarding/isOnboardingSkipped via sessionStorage key, `checked` loading flag
- App shell: Billing/Analytics NavLinks (nav-billing/nav-analytics) under selectedOrgId, EnvIndicator staging pill (env-badge), LimitBanner above outlet, New board disabled with limit-tooltip at project limit
- protected-route.tsx first-run guard: zero-project authenticated users redirected to /onboarding once per session, no redirect loop (pathname guard)
- Route stubs registered in App.tsx: /onboarding ("Get started"), /orgs/:orgId/billing ("Billing"), /orgs/:orgId/analytics ("Analytics") — page-title convention `text-2xl font-semibold`
- 10 new tests (4 hook + 3 env-indicator + 3 limit-banner); full suite 49 files / 235 tests pass; repo-wide typecheck 12/12, lint 12/12

## Task Commits

Each task was committed atomically:

1. **Task 1: shadcn primitives + App.tsx routes + three hooks + use-billing tests** - `a525cd3` (feat)
2. **Task 2: App shell — nav links, env-indicator, limit-banner mount, New board disable** - `752a3de` (feat)
3. **Task 3: First-run onboarding redirect guard** - `1b4ddb8` (feat)

## Files Created/Modified

- `packages/ui/src/components/{skeleton,alert,dialog,select,table,progress}.tsx` - official-registry shadcn v4 primitives (Base UI)
- `packages/ui/src/components/button.tsx` - dialog add refreshed from registry; eslint-disable restored for buttonVariants export
- `apps/web/src/hooks/use-billing.ts` - useBilling/useCheckout/useDowngrade/useUsage + UsageView type
- `apps/web/src/hooks/use-analytics.ts` - 30d analytics query
- `apps/web/src/hooks/use-onboarding.ts` - first-run detection + sessionStorage skip
- `apps/web/src/components/env-indicator.tsx` - staging-only pill
- `apps/web/src/components/limit-banner.tsx` - non-dismissible over-limit strip + Upgrade to Pro
- `apps/web/src/components/app-shell.tsx` - nav links, env badge, limit banner, disabled New board
- `apps/web/src/components/protected-route.tsx` - first-run onboarding redirect
- `apps/web/src/routes/{onboarding,billing,analytics}.tsx` - page-title stubs (bodies in 03-05/03-06)
- `apps/web/src/App.tsx` - three routes registered under AppShell
- Test files: use-billing.test.tsx, env-indicator.test.tsx, limit-banner.test.tsx; app-shell + protected-route test mocks extended

## Decisions Made

- Hosted-redirect checkout (window.location.href) per UI-SPEC V2b — no Stripe.js dependency in the web bundle
- useUsage exposes isAtLimit/pct as the single derived source for meters, banner, and disabled actions (03-05 consumes it directly)
- First-run check fans out useQueries over orgs with the same `["projects", orgId]` key the boards already use — cache reuse, no duplicate network fetches
- Onboarding skip is session-scoped (sessionStorage), matching UI-SPEC V3 "Skip dismisses for the session"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `bun --filter @workspace/ui add` failed with "No packages matched the filter"**

- **Found during:** Task 1 (primitive install)
- **Issue:** The plan's install command `bun --filter @workspace/ui add skeleton` errored: no package matched the filter (workspace-filter + add subcommand interaction on this repo).
- **Fix:** Ran the shadcn CLI directly from packages/ui (`bunx shadcn add <name>`) — the exact same official registry + components.json path, one primitive per command as the plan requires. All 6 landed under packages/ui/src/components/.
- **Files modified:** n/a (install mechanism only)
- **Verification:** glob each primitive → all 6 present
- **Committed in:** a525cd3 (Task 1 commit)

**2. [Rule 3 - Blocking] dialog install refreshed button.tsx from registry, dropping the eslint-disable needed for `buttonVariants` export**

- **Found during:** Task 1 (post-install `bun run lint`)
- **Issue:** `shadcn add dialog` prompted to overwrite button.tsx (registry drift vs local); the merged `export { Button, buttonVariants }` trip the `react-refresh/only-export-components` rule.
- **Fix:** Restored the two-statement export with the eslint-disable comment (original form). No functional change — the registry body was otherwise identical.
- **Files modified:** packages/ui/src/components/button.tsx
- **Verification:** `bun run lint` → 12/12 tasks pass
- **Committed in:** a525cd3 (Task 1 commit)

**3. [Rule 3 - Blocking] JSX in use-billing.test.ts made vitest fail at transform**

- **Found during:** Task 1 (first `bun run test`)
- **Issue:** The test file used JSX (`<QueryClientProvider>`) with a `.ts` extension; vitest/esbuild rejected it ("Expected \">\" but found \"client\"").
- **Fix:** Renamed to `use-billing.test.tsx` (matches existing hook tests).
- **Files modified:** apps/web/src/hooks/**tests**/use-billing.test.tsx
- **Verification:** suite passes (4/4)
- **Committed in:** a525cd3 (Task 1 commit)

**4. [Rule 2 - Missing Critical] Existing app-shell + protected-route tests hit the real useBilling/useOnboarding fetches after shell wiring**

- **Found during:** Tasks 2-3 (post-wiring test run)
- **Issue:** app-shell.tsx now calls useUsage → useBilling and protected-route.tsx calls useOnboarding → useOrgs; the pre-existing test mocks didn't cover them, so tests would issue real apiClient fetches in jsdom.
- **Fix:** Extended the vi.mock factories in both test files (use-billing with useUsage, use-onboarding with needsOnboarding:false) — keeps tests hermetic, no production change.
- **Files modified:** apps/web/src/components/**tests**/app-shell.test.tsx, apps/web/src/components/**tests**/protected-route.test.tsx
- **Verification:** full suite 235/235 passes
- **Committed in:** 752a3de (Task 2), 1b4ddb8 (Task 3)

---

**Total deviations:** 4 auto-fixed (3 blocking, 1 missing critical)
**Impact on plan:** All fixes required for correct install/lint/test hygiene. No scope creep — no production behavior changed beyond the plan's contract.

## Issues Encountered

- `bun --filter web test` is broken repo-wide (bypasses root vitest config → no jsdom; 18 files fail). Documented in 02-02-SUMMARY. Used `bun run test` from the repo root for all web test verification — the plan's `<verify>` command was run as its functional equivalent.
- shadcn CLI is interactive on overwrite prompts (`--yes` does not skip them) — piped `y` for the dialog→button refresh, then restored the lint-required export form.

## Known Stubs

- Route pages (onboarding.tsx, billing.tsx, analytics.tsx) are intentional page-title placeholders — bodies land in 03-05 (billing) and 03-06 (onboarding + analytics). Contracted in the plan; not a defect.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. Client-side billing state is display-only by design (T-03-30..T-03-33 accepted in the plan threat model; enforcement is the API 402 from 03-02).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 03-05 (billing page):** useBilling/useCheckout/useDowngrade/useUsage + BillingState contract + billing.tsx stub; nav-billing/limit-banner/limit-tooltip anchors in place; skeleton/dialog/select/table/progress primitives installed
- **Ready for 03-06 (onboarding + analytics):** useOnboarding + useAnalytics + onboarding/analytics stubs + protected-route guard; env-badge anchor for deployment polish
- **Ready for 03-07 (E2E):** all E2E-03 visual anchors exist (nav-billing, nav-analytics, env-badge, limit-banner, limit-tooltip, new-board)
- Threat model honored: T-03-30 (banner display-only, server-truth), T-03-31 (member-readable billing payload), T-03-32 (session-only skip), T-03-33 (build-time env badge), T-03-SC (official registry only)

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 21 created files verified present on disk (`[ -f ]` spot-checks: hooks, components, routes, tests, primitives)
- All 3 task commits verified in git log: a525cd3, 752a3de, 1b4ddb8
- `bun run test`: 49 files / 235 tests pass
- `bun --filter web typecheck`: pass; `bun run typecheck`: 12/12 tasks pass
- `bun run lint`: 12/12 tasks pass
- grep: nav-billing/nav-analytics/env-badge/limit-banner testids present in app-shell + components; `export default` count 0 on all three hook files
