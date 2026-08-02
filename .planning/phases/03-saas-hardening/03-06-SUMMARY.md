---
phase: 03-saas-hardening
plan: 06
subsystem: ui
tags:
  [
    onboarding,
    analytics,
    react,
    tanstack-query,
    shadcn,
    custom-svg,
    charts,
    e2e-anchors,
  ]

# Dependency graph
requires:
  - phase: 03-saas-hardening
    provides: AnalyticsState/templateCreateSchema types (03-01), analytics + template-seed API (03-03), useAnalytics/useOnboarding hooks + route stubs + first-run guard (03-04)
provides:
  - 2-step onboarding flow (/onboarding): welcome → template pick, blank board via useCreateProject, sample board via POST /api/orgs/:orgId/projects/template, session skip
  - TemplateCard component (icon/name/description + "Use template" pending state)
  - Analytics dashboard (/orgs/:orgId/analytics): StatCard row + custom SVG BarChart per series + V5c empty state + V5d error/retry
  - BarChart: token-color fills (chart-1/2/3), native title tooltips, aria-hidden, data-value anchors, 2px zero stubs
  - All O1/A1 E2E anchors from the UI-SPEC table in place for 03-07
affects: [03-07-e2e]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom SVG bar chart (no recharts): fixed viewBox, per-series token color via explicit FILLS map, native <title> tooltips, aria-hidden decorative duplication — stat cards carry accessible values"
    - "Per-card pending state (pending === 'blank' | 'sample') so only the clicked template disables with Creating…; buttons re-enable via finally"
    - "Empty-state ownership: BarChart returns null on all-zero/empty series; the page decides the V5c empty state from totals — no chart-side special casing"
    - "orgId resolution: selectedOrgId ?? first org (board-store + useOrgs), same convention as projects.tsx"

key-files:
  created:
    - apps/web/src/components/template-card.tsx
    - apps/web/src/components/stat-card.tsx
    - apps/web/src/components/bar-chart.tsx
    - apps/web/src/components/__tests__/template-card.test.tsx
    - apps/web/src/components/__tests__/bar-chart.test.tsx
    - apps/web/src/routes/__tests__/analytics.test.tsx
  modified:
    - apps/web/src/routes/onboarding.tsx
    - apps/web/src/routes/analytics.tsx

key-decisions:
  - "BarChart fill via explicit FILLS map (var(--chart-1/2/3) literals) instead of a template literal — keeps the token-only contract greppable per the acceptance criterion"
  - "Template card testids live on wrapper divs in onboarding.tsx (plan: 'data-testid prop passed via parent wrapper') — TemplateCard stays generic, the route owns the anchors"
  - "Welcome heading falls back to 'Welcome to {orgName}' when the user has orgs (zero-project first-run state), else 'Welcome to Storyteller'"
  - "Zero-value points render a 2px stub baseline; all-zero/empty series render nothing so the page owns the empty state"

patterns-established:
  - "Chart testids derive the metric from the svg testid (analytics-chart-{metric} → analytics-bar-{metric}-{index}) — one prop drives both anchors"
  - "Skeleton loading states match the UI-SPEC: 4× h-20 stat skeletons + one h-40 chart skeleton; onboarding 2× h-24 template skeletons"

requirements-completed: [E2E-03]

# Metrics
duration: 12min
completed: 2026-08-02
---

# Phase 3 Plan 6: Onboarding Flow + Analytics Dashboard Summary

**2-step onboarding flow (welcome → template pick with blank-board create, product-launch sample seed, session skip) and the analytics dashboard (4 stat cards + 3 custom SVG bar charts with token-color fills and native title tooltips, empty/error states) — every O1/A1 UI-SPEC E2E anchor shipped for the 03-07 journeys.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-02T19:32:17Z
- **Completed:** 2026-08-02T19:44:00Z
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- `OnboardingPage` — 2-step flow: step indicator ("1 of 2"/"2 of 2", 12px muted, no progress bar), `onboarding-welcome` heading "Welcome to Storyteller" (org-aware fallback "Welcome to {orgName}"), "Get started" → step 2; `onboarding-template` "How would you like to start?" with the two template cards; blank card runs `useCreateProject().mutateAsync({ orgId, name: "Untitled board" })` and navigates to `/projects/{slug}`; sample card POSTs `/api/orgs/{orgId}/projects/template` `{ templateId: "product-launch" }` via apiClient and navigates to the seeded board; skip calls `dismissOnboarding()` (sessionStorage, 03-04 guard) + navigates to `/projects` — no re-trigger loop
- `TemplateCard` — icon (14px), name (14px/600), description (12px muted), primary sm "Use template" button; pending prop disables + "Creating…"; per-card pending tracking re-enables buttons in `finally` after failure
- Loading: 2 skeleton template cards (`animate-pulse bg-muted rounded-lg h-24`) while orgs load; failure: inline "Couldn't create your board. Try again." (12px destructive) under the cards
- `StatCard` — value 24px/600 + label 12px muted; 4 cards with `analytics-stat-{metric}` anchors
- `BarChart` — custom SVG (no recharts, T-03-SC), viewBox 560×160, rect per point with slot-width math (gap ≥ 4px), `rx=2`, fill from explicit `FILLS` map (`var(--chart-1/2/3)` tokens only), native `<title>{date}: {value}</title>` per bar, `aria-hidden="true"` + stat cards carry accessible values (T-03-51), `data-value` anchors; zero points render a 2px stub baseline; all-zero/empty series returns null (page owns the V5c empty state)
- `AnalyticsPage` — "Analytics" title, 4 skeleton stat cards + skeleton chart block on load, V5d error banner "Couldn't load analytics." + `analytics-retry` refetch, V5c empty state (py-24, "No activity yet", exact body copy, `analytics-empty-cta` → /projects), data view: 4 StatCards + 3 charts (cardsCreated→chart-1, proposalsApproved→chart-2, commentsPosted→chart-3)
- 9 new tests (3 template-card + 3 bar-chart + 3 analytics); full suite 56 files / 260 tests pass; web typecheck + repo typecheck 12/12, lint 12/12

## Task Commits

Each task was committed atomically:

1. **Task 1: Onboarding flow + template-card + tests** - `95d36a2` (feat)
2. **Task 2: Analytics dashboard + stat-card + bar-chart + tests** - `77f954e` (feat)

## Files Created/Modified

- `apps/web/src/routes/onboarding.tsx` - 2-step flow replacing the 03-04 stub (kept `OnboardingPage` export)
- `apps/web/src/routes/analytics.tsx` - dashboard body replacing the 03-04 stub (kept `AnalyticsPage` export)
- `apps/web/src/components/template-card.tsx` - TemplateCard (icon/name/description + "Use template" with pending)
- `apps/web/src/components/stat-card.tsx` - StatCard (value + label)
- `apps/web/src/components/bar-chart.tsx` - BarChart (custom SVG, token fills, title tooltips, data-value)
- `apps/web/src/components/__tests__/template-card.test.tsx` - render/click/pending tests
- `apps/web/src/components/__tests__/bar-chart.test.tsx` - rects/testids/data-value, title tooltips, all-zero → nothing
- `apps/web/src/routes/__tests__/analytics.test.tsx` - 4 stat cards, empty state, error state (mocked useAnalytics)

## Decisions Made

- BarChart fill uses an explicit `FILLS` map with literal `var(--chart-1/2/3)` strings rather than a `var(--${colorVar})` template literal — the acceptance criterion greps `var(--chart-`, and literals keep the token-only contract self-documenting and checkable.
- Template card `data-testid` anchors live on wrapper divs in onboarding.tsx (per plan's "testid prop passed via parent wrapper") — TemplateCard remains generic and reusable; the route owns the O1 anchors.
- Welcome heading: `orgs[0].name` present → "Welcome to {orgName}" (the zero-project first-run state always has the fallback condition), else "Welcome to Storyteller".
- Chart bar metric derived from the svg testid (`analytics-chart-{metric}` → `analytics-bar-{metric}-{index}`) — single prop drives both anchor namespaces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BarChart fill color not greppable per the acceptance criterion**

- **Found during:** Task 2 (acceptance grep for `var(--chart-`)
- **Issue:** Initial implementation used `style={{ fill: \`var(--${colorVar})\` }}`— correct at runtime but the literal string`var(--chart-` never appears in source, so the "Fill colors use var(--chart-1/2/3) tokens only" grep criterion fails even though no hex exists.
- **Fix:** Replaced the template literal with an explicit `FILLS: Record<BarChartColorVar, string>` map containing the literal token strings `var(--chart-1)`, `var(--chart-2)`, `var(--chart-3)`.
- **Files modified:** apps/web/src/components/bar-chart.tsx
- **Verification:** grep `var(--chart-` → 3 matches; web typecheck passes; bar-chart suite 3/3 passes
- **Committed in:** 77f954e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Correctness of the acceptance gate only — the fill contract was always token-based; the fix makes it provable. No scope creep.

## Issues Encountered

- `bun --filter web test` remains broken repo-wide (bypasses root vitest config → no jsdom; pre-existing, documented in 02-02/03-04/03-05). Used `bun run test` from the repo root as the functional equivalent for all test verification — 56 files / 260 tests pass.
- lint-staged prettier hook reformatted staged files on both commits (auto-fixed, re-staged, committed cleanly — no manual follow-up needed).

## Authentication Gates

None — no external services or credentials involved (no installs; T-03-SC honored).

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. The welcome-heading org fallback renders "Welcome to Storyteller" when `useOrgs` is still loading or the user has no orgs — that is the contract's base state, not a stub.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. Both surfaces are covered by the plan's register: T-03-50 (template creation goes through the authenticated apiClient to the role-gated + limit-checked 03-03 endpoint; UI-only), T-03-51 (charts aria-hidden, stat cards carry accessible values), T-03-52 (series bounded to the server's 30d window; SVG viewBox fixed 560×160), T-03-SC (no installs — custom SVG, no recharts).

## Next Phase Readiness

- **Ready for 03-07 (E2E):** all O1 anchors (`onboarding-welcome/start/template/skip/template-blank/template-product-launch`) and A1 anchors (`analytics-stat-{metric}`, `analytics-chart-{metric}`, `analytics-bar-{metric}-{index}` + `data-value`, `analytics-empty-cta`, `analytics-retry`) exist in the DOM contract; server behavior from 03-03 is deterministic to assert against
- Manual smoke (post 03-03): fresh-user signup → /onboarding renders; seeded-activity org → /orgs/:orgId/analytics shows stats + charts
- Threat model honored: T-03-50/T-03-51/T-03-52/T-03-SC as above

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 6 created files verified present on disk (`[ -f ]`)
- Both task commits verified in git log: `95d36a2`, `77f954e`
- Full suite: `bun run test` → 56 files / 260 tests pass
- `bun run typecheck` → 12/12 tasks pass; `bun run lint` → 12/12 tasks pass
- grep: all 6 onboarding anchors + 9 analytics anchors present; `var(--chart-` ×3 in bar-chart.tsx; `data-value` + `aria-hidden` + `<title>` in bar-chart.tsx; exact V5c empty copy in analytics.tsx
