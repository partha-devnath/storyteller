---
phase: 02-graph-collaboration-depth
plan: 5
subsystem: testing
tags: [playwright, e2e, graph, sse, export, mock-ai]

# Dependency graph
requires:
  - phase: 02-01
    provides: graph payload API, SSE event stream, export routes (CSV/JSON/Markdown)
  - phase: 02-03
    provides: graph view with nodes/edges/filters/impact + data-testid contract
  - phase: 02-04
    provides: comments/@mentions UI + SSE live indicator + new-comments pill
provides:
  - Three Phase 2 E2E journeys (graph, comments/mentions/SSE, export) extending apps/e2e/src/core-loop.test.ts
  - Deterministic graph fixture in the e2e seed (org, epics, cards, relations, versions)
  - Fixes required for E2E: React Flow Handles on custom graph nodes, SSE stream flush + Bun idleTimeout, mention-composer double-@ bug, drawer title testid

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Deterministic seed IDs shared between seed and test processes (TEST_USER_ID, C1..C5, GRAPH_PROJECT_SLUG)
    - SSE browser tests poll the live-indicator data-status attribute; API posts (page.request) use the absolute API origin (no Vite proxy)

key-files:
  created:
    - .planning/phases/02-graph-collaboration-depth/02-05-SUMMARY.md
  modified:
    - apps/e2e/src/seed.ts
    - apps/e2e/src/core-loop.test.ts
    - apps/web/src/components/graph-node.tsx
    - apps/web/src/components/comment-composer.tsx
    - apps/web/src/components/card-drawer.tsx
    - apps/api/src/routes/events.ts
    - apps/api/src/index.ts

key-decisions:
  - "React Flow custom nodes must render <Handle> elements or edges cannot attach (error #008) — added invisible source/target handles to graph-node.tsx"
  - "Bun.serve default idleTimeout (10s) kills idle SSE streams; set idleTimeout: 0 and emit an immediate ': connected' frame so the browser EventSource fires onopen"
  - "Mention picker selection must replace the trigger '@' token (was inserting '@@Name'); fixed handleSelect in comment-composer"
  - "E2E API posts from the test must use the absolute API origin (http://localhost:3001) since the web app has no Vite /api proxy"

patterns-established:
  - "E2E journeys reuse the seeded graph fixture (graph-demo slug) via shared deterministic IDs for deterministic assertions"
  - "SSE live-update journeys: open drawer → assert live-indicator data-status=open → post via API → assert new-comments-pill + refreshed list without reload"

requirements-completed: [E2E-02]

# Metrics
duration: 90min
completed: 2026-08-02
---

# Plan 05: Phase 2 E2E Journeys Summary

Three Playwright journeys automate the Phase 2 deliverables — graph rendering/filters/impact, comments + @mentions + SSE live updates, and board export — against the isolated test DB with a deterministic seeded fixture and the mock AI provider.

## Performance

- **Duration:** ~1.5h (E2E debugging: React Flow Handles, SSE flush/idle timeout, mention composer, API origin)
- **Completed:** 2026-08-02
- **Tasks:** 3 planned
- **Files modified:** 7

## Accomplishments

- J1 (graph): renders 7 nodes + 10 edges (2 dependency / 7 hierarchy / 1 evolution), edge-type filter toggles work, impact-of-X highlights {C2,C3,C4}, node click opens the card drawer
- J2 (comments/mentions/SSE): mention picker shows seeded member, posting renders a mention chip, live indicator reaches open, API-posted comment surfaces without reload via new-comments-pill
- J3 (export): CSV/JSON/Markdown downloads for the fixture board with correct content
- All 12 E2E tests pass (5 smoke + 7 phase 1 + 3 phase 2)

## Task Commits

1. **Task 1: seeded graph fixture** — `eea38e4` (feat)
2. **Task 2+3: journeys + E2E fixes** — committed together (feat)
3. **Plan metadata (SUMMARY)** — committed (docs)

## Files Created/Modified

- `apps/e2e/src/seed.ts` — deterministic graph fixture: E2E Org, Graph Demo project, 2 epics, 5 cards (4 open, 1 closed), v1 versions, dependency/hierarchy/evolution relations; shared deterministic IDs
- `apps/e2e/src/core-loop.test.ts` — `test.describe.serial("phase 2")` with J1 (graph), J2 (comments/mentions/SSE), J3 (export)
- `apps/web/src/components/graph-node.tsx` — added invisible source/target `<Handle>` elements so React Flow can attach edges (error #008)
- `apps/web/src/components/comment-composer.tsx` — `handleSelect` replaces the trigger "@" token instead of inserting a second "@" ("@Name" not "@@Name")
- `apps/web/src/components/card-drawer.tsx` — `data-testid="card-drawer-title"` for stable drawer title assertion
- `apps/api/src/routes/events.ts` — emit immediate `: connected` frame so the EventSource fires `onopen`
- `apps/api/src/index.ts` — `Bun.serve({ idleTimeout: 0 })` so idle SSE streams are not torn down at the 10s default

## Decisions Made

1. **React Flow Handles** — custom graph nodes must render `<Handle type="source" />`/`<Handle type="target" />` (invisible via `!opacity-0`) for edges to connect.
2. **SSE viability in browser** — two-part fix: flush the response immediately (initial frame) and disable Bun's idle timeout.
3. **Mention composer** — selection should replace the pending "@" trigger token, otherwise every mention becomes "@@Name" and the segment parser treats it as plain text.
4. **API origin in tests** — `page.request` bypasses the Vite dev server's (nonexistent) `/api` proxy; use the absolute `http://localhost:3001` origin.

## Deviations from Plan

### Auto-fixed Issues

**1. E2E-BUG — React Flow custom edges never render**

- **Found during:** J1
- **Issue:** `data-edge-type` elements absent; console showed "Couldn't create edge for source handle id: null" (error #008). Custom nodes lacked `<Handle>`.
- **Fix:** Added invisible source/target Handles to `graph-node.tsx`.
- **Verification:** J1 edge counts pass (2/7/1).

**2. E2E-BUG — SSE status stuck at "connecting"**

- **Found during:** J2
- **Issue:** Browser EventSource never fired `onopen` — Bun didn't flush response headers until the first body frame (25s heartbeat), and the 10s default `idleTimeout` tore down idle streams.
- **Fix:** Emit an immediate `: connected` frame on connect; set `Bun.serve({ idleTimeout: 0 })`.
- **Verification:** live-indicator `data-status` reaches "open".

**3. WEB-BUG — mention composer inserts "@@Name"**

- **Found during:** J2
- **Issue:** Selecting a mention after typing "@" produced "@@Name" (trigger token not replaced), so the segment parser rendered no chip.
- **Fix:** `handleSelect` replaces the pending "@" token.
- **Verification:** `comment-mention` chip renders "@E2E User".

**4. E2E-BUG — API-posted comment 404**

- **Found during:** J2
- **Issue:** `page.request.post("/api/cards/...")` resolved against baseURL `http://localhost:5173` (no Vite /api proxy), returning 404.
- **Fix:** Use absolute API origin from `VITE_API_URL` (default http://localhost:3001).
- **Verification:** `res.ok()` truthy; SSE comment surfaces.

**5. E2E-BUG — drawer title assertion ambiguous**

- **Found during:** J1
- **Issue:** `drawer.getByText("Enrollment form")` matched multiple nodes / concatenated text.
- **Fix:** Added `data-testid="card-drawer-title"`; assert exact text.
- **Verification:** J1 drawer assertion passes.

---

**Total deviations:** 5 auto-fixed
**Impact on plan:** All fixes were necessary for the E2E journeys to pass; two were genuine app bugs (SSE, mention composer) that would affect real users.

## Issues Encountered

- **Interrupted executor run** — the 02-05 executor was cancelled mid-task after committing the seed fixture; the journeys were completed directly (test file finished, SSE/composer/node fixes applied, suite verified green).

## User Setup Required

None - no external service configuration required. E2E requires the standard dev infra: `docker compose up -d postgres mailpit`.

## Next Phase Readiness

- Phase 2 E2E regression net green (12/12 total: smoke + Phase 1 + Phase 2).
- J1/J2/J3 map 1:1 to Phase 2 success criteria (graph edges, comments/mentions/SSE, export).
- Phase 3 (SaaS hardening) extends the same seed/journey pattern.

---

_Phase: 02-graph-collaboration-depth_
_Completed: 2026-08-02_
