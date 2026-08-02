---
phase: 03-saas-hardening
plan: 03
subsystem: api
tags:
  [
    analytics,
    template-seeding,
    onboarding,
    aggregation,
    drizzle,
    hono,
    bun,
    org-scoped,
  ]
requires:
  - phase: 03-saas-hardening
    provides: AnalyticsState contract, templateCreateSchema/analyticsRangeSchema, requireOrg/requireRole middleware, assertLimit (402), usage counters
provides:
  - analytics service: getAnalytics (org-scoped 30d totals + daily series + activeMembers), pure buildDailySeries/computeTotals/dayKey
  - template-seed service: PRODUCT_LAUNCH_TEMPLATE (2 epics / 6 stories), pure buildSeedRows, atomic seedTemplateProject (transaction)
  - analyticsRoutes GET /api/orgs/:orgId/analytics?range=30d (any member, range enum-locked, 400 on invalid)
  - templatesRoutes POST /api/orgs/:orgId/projects/template (owner/admin/member + assertLimit projects, 201 { slug })
affects: [03-04-frontend-hooks, 03-07-e2e, 03-08-deploy]

tech-stack:
  added: []
  patterns:
    - "Pure aggregation/series builders (buildDailySeries) exported for DB-free unit tests; DB wiring thin (getAnalytics)"
    - "Pure seed row builder (buildSeedRows) returns exact inserts; seedTemplateProject is a thin atomic transaction wrapper"
    - "org-scoped aggregation via inArray(projectId, orgProjectIds) — cross-org rows structurally impossible (T-03-20)"

key-files:
  created:
    - apps/api/src/services/analytics.ts
    - apps/api/src/services/template-seed.ts
    - apps/api/src/routes/analytics.ts
    - apps/api/src/routes/templates.ts
    - apps/api/src/__tests__/analytics.test.ts
    - apps/api/src/__tests__/template-seed.test.ts
    - apps/api/src/__tests__/phase3-routes.test.ts
  modified:
    - apps/api/src/app.ts

key-decisions:
  - 'Route params named :id (not :orgId) to match requireOrg''s param("id") fallback — path shape /api/orgs/{orgId}/analytics unchanged (same decision as 03-02 billing routes)'
  - "Template seeding wrapped in db.transaction — partial seeds on failure would leave orphan epics/cards; atomicity is a correctness requirement"
  - "activeMembers computed as JS union of two selectDistinct sets (proposal.createdBy ∪ comment.userId) — deterministic, no complex SQL union"
  - "Empty-org analytics returns zeroed 30-bucket series (not empty arrays) so the frontend chart renders the V5c empty state without shape special-casing"

patterns-established:
  - "Window-aligned queries: seriesStart (midnight UTC, rangeDays-1 days back) used both as the query gte bound and the series bucket origin — one source of truth for the window"
  - "buildSeedRows card slugs derive from story index (slugify(title)-N) — deterministic for tests while remaining unique per project"

requirements-completed: [E2E-03]

duration: 7min
completed: 2026-08-02
---

# Phase 3 Plan 3: Analytics + Template Seeding API Summary

**Org-scoped 30-day analytics endpoint (totals + 3 daily series + activeMembers) and the product-launch template seeder (2 epics / 6 cards / 6 create versions, atomic transaction) — both role-gated, limit-aware, and covered by 16 new bun:test cases across pure series math, seed-row integrity, and route auth gates**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-02T19:01:00Z
- **Completed:** 2026-08-02T19:07:42Z
- **Tasks:** 3 (2 TDD: 5 commits)
- **Files modified:** 8 (7 created, 1 modified)

## Accomplishments

- `analytics.ts` service: pure `buildDailySeries` (UTC daily buckets ending today, window exclusion, zeroed empty series) + `computeTotals` + `dayKey`; DB-backed `getAnalytics(orgId, rangeDays=30)` aggregating cards created, proposals approved (bucketed by `approvedAt`), comments posted (joined to cards for org scoping), and activeMembers (distinct-user union over proposals ∪ comments) — all filtered by the org's project ids via `inArray` (T-03-20)
- Empty-org path returns a zeroed AnalyticsState with 30 zero-buckets and `generatedAt` — the UI-SPEC V5c empty state shape
- `template-seed.ts` service: `PRODUCT_LAUNCH_TEMPLATE` (2 epics — "Go-to-market", "Launch operations" — 6 stories, every story with markdown description + 1–3 acceptance criteria), pure `buildSeedRows(template, orgId, userId)` returning exact project/epics/cards/versions inserts, and `seedTemplateProject` wrapping the inserts in a `db.transaction` (atomic; unknown templateId → 400)
- `analyticsRoutes` GET `/:id/analytics` (any member; range zod enum-locked to 30d, invalid → 400) and `templatesRoutes` POST `/:id/projects/template` (requireRole owner/admin/member + `assertLimit(orgId, "projects")` before seeding — template creates a project, same gate as POST /api/projects)
- Both route sub-apps mounted in `app.ts` after orgs/billingRoutes
- 75 API tests pass (16 new: 7 analytics + 6 template-seed + 3 phase3-routes), api typecheck/lint clean, repo-wide typecheck 12/12, live-server smoke: both new endpoints 401 unauthenticated

## Task Commits

Each task was committed atomically (TDD tasks split RED/GREEN):

1. **Task 1: Analytics aggregation service** — `be7a0a3` (test, RED) + `e3ac49b` (feat, GREEN)
2. **Task 2: Template seeding service** — `02fcf71` (test, RED) + `a4b52e4` (feat, GREEN)
3. **Task 3: Analytics + template routes, mounting, route-gating tests** — `2956502` (feat)

**Plan metadata:** `docs(03-03): complete analytics + template api plan` (final docs commit — SUMMARY + STATE/ROADMAP/REQUIREMENTS)

## Files Created/Modified

- `apps/api/src/services/analytics.ts` — DailyPoint/AnalyticsSeries types, buildDailySeries, computeTotals, dayKey, getAnalytics (org-scoped aggregation + activeMembers union)
- `apps/api/src/services/template-seed.ts` — TemplateDefinition/types, PRODUCT_LAUNCH_TEMPLATE, buildSeedRows (pure row builder), seedTemplateProject (atomic transaction)
- `apps/api/src/routes/analytics.ts` — analyticsRoutes GET /:id/analytics with requireOrg + range validation
- `apps/api/src/routes/templates.ts` — templatesRoutes POST /:id/projects/template with requireOrg/requireRole/validateBody/assertLimit
- `apps/api/src/app.ts` — imports + mounts analyticsRoutes + templatesRoutes
- `apps/api/src/__tests__/analytics.test.ts` — bucket math, window exclusion, totals, empty series, getAnalytics contract
- `apps/api/src/__tests__/template-seed.test.ts` — template shape (2 epics/6 stories), buildSeedRows integrity (card→epic refs, version rows, deterministic slugs)
- `apps/api/src/__tests__/phase3-routes.test.ts` — 401 gates on both endpoints, range schema validation

## Decisions Made

- Route param named `:id` (not `:orgId`) to match requireOrg's `param("id")` fallback — same convention as 03-02 billing routes; URL shape unchanged
- Template seed wrapped in a `db.transaction` — plan described sequential inserts, but a mid-seed failure would leave orphaned epics/cards; atomicity is a correctness requirement (Rule 2)
- activeMembers = JS `Set` union of two `selectDistinct` queries — deterministic and simpler than a SQL UNION, org-scoped by construction
- Empty-org analytics returns zeroed 30-bucket series rather than `[]` — the UI-SPEC V5c empty state checks for all-zero series; shape stays constant for the chart

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Template seeding wrapped in db.transaction**

- **Found during:** Task 2 (seedTemplateProject implementation)
- **Issue:** Plan specified sequential `db.insert` calls for project → epics → cards → versions. A failure mid-seed would leave orphaned epic/card rows with no project owner (epics/cards cascade from project, but a partial insert set is still corrupt state for an org that hit an error).
- **Fix:** All inserts run inside a single `db.transaction` — any failure rolls back the entire seed, leaving the org untouched.
- **Files modified:** apps/api/src/services/template-seed.ts
- **Verification:** Typecheck passes; transaction typing mirrors apply-proposal.ts; tests assert row-builder contract, DB path exercised by E2E (03-07)
- **Committed in:** a4b52e4 (Task 2 commit)

**2. [Rule 1 - Bug] Unused httpError import in templates.ts route**

- **Found during:** Task 3 (`bun --filter api lint`)
- **Issue:** lint failed on `'httpError' is defined but never used` — templates.ts throws no httpError itself (the 400 guard lives inside seedTemplateProject).
- **Fix:** Removed the unused import.
- **Files modified:** apps/api/src/routes/templates.ts
- **Verification:** `bun --filter api lint` exits 0
- **Committed in:** 2956502 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes correctness/quality-only, no scope creep. Transaction adds atomicity; lint fix keeps CI green.

## Issues Encountered

- None beyond the deviations above. The `:id` param naming choice (matching requireOrg) was applied deliberately from the 03-02 precedent — the plan's `:orgId` label in the action text resolves to the same URL shape.

## Authentication Gates

None — no external services or credentials involved (no installs; T-03-SC honored).

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None — both new endpoints are covered by the plan's threat register (T-03-20 analytics org-scoping, T-03-21 template tampering, T-03-22 elevation/role gate + limit, T-03-23 fixed-range DoS accepted). No surface outside the register.

## Next Phase Readiness

- Ready for **03-04** (frontend hooks): `useAnalytics` consumes GET /api/orgs/:orgId/analytics AnalyticsState; onboarding step 2's "Sample — Product launch" card POSTs templateCreateSchema payload and navigates to returned `{ slug }`
- Ready for **03-07** (E2E): A1 analytics journey (seeded activity → stats + chart bars) and O1 onboarding journey (template-product-launch card seeds 2 epics / 6 cards) have deterministic server behavior to assert against
- Ready for **03-08** (deploy): no new env vars or services
- Threat model honored: T-03-20 (inArray org scoping), T-03-21 (zod enum + compile-time constant template), T-03-22 (requireRole owner/admin/member + assertLimit projects), T-03-23 (30d enum-locked), T-03-SC (no installs)

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 7 key files exist on disk (verified with `[ -f ]` during execution)
- 5 task commits present in git log: `be7a0a3`, `e3ac49b`, `02fcf71`, `a4b52e4`, `2956502`
- 75 API tests pass, api typecheck/lint clean, repo-wide typecheck 12/12
- `grep -c "export default"` on analytics.ts and template-seed.ts = 0
- `assertLimit` present in templates route (1), both routes mounted in app.ts (2 `app.route` lines), 401 smoke confirmed on live server
