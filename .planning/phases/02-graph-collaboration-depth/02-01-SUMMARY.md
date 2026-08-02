---
phase: 02-graph-collaboration-depth
plan: 01
subsystem: api
tags: [graph, sse, event-bus, export, csv, markdown, org-scope]

# Dependency graph
requires:
  - phase: 01-04
    provides: org-scope middleware (resolveOrgFromProject, requireRole, httpError) and Hono sub-app pattern
  - phase: 01-05
    provides: card/proposal/AI routes with DB row conventions, apply-proposal service, AppEnv types
  - phase: 01-02
    provides: Drizzle schema tables (card, epic, cardRelation, comment, user)
provides:
  - GET /api/projects/:slug/graph — org-scoped { nodes, edges } covering epics + cards (open+closed) with dependency/hierarchy/evolution relations
  - GET /api/projects/:slug/events — SSE stream (comment.created, card.created, card.updated, proposal.ready) to org members only
  - GET /api/projects/:slug/export?format=csv|json|md — org-scoped file download with Content-Disposition attachment
  - In-process event bus (publish/subscribe keyed by projectId) wired into card, proposal (apply-proposal), and AI routes
affects:
  [
    02-02 (frontend graph view),
    02-03 (live comments),
    02-04 (client SSE parsing),
  ]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-level middleware (not use('*')) for sibling sub-apps mounted at a shared prefix: a use('*') auth gate on one sub-app intercepts every request to sibling sub-apps at the same prefix (Hono route() flattens sub-app routes into the parent router), so auth/validation middleware is applied per-route instead"
    - "Path-scoped middleware (exportRoutes.use('/:slug/export', ...)) runs format validation before the auth gate so an invalid format returns 400 even unauthenticated (contract in plan acceptance criteria)"
    - "SSE over native ReadableStream: subscribe(projectId) → enqueue 'event: {type}\\ndata: {payload}\\n\\n', 25s ': ping' heartbeat, unsubscribe + clearInterval on abort signal / stream cancel"
    - "Pure graph builder (buildGraphPayload) with deterministic node/edge mapping; all Drizzle queries live in the route, org-scoped by c.var.projectId"

key-files:
  created:
    - apps/api/src/services/event-bus.ts
    - apps/api/src/services/graph-payload.ts
    - apps/api/src/services/export-data.ts
    - apps/api/src/routes/graph.ts
    - apps/api/src/routes/events.ts
    - apps/api/src/routes/export.ts
    - apps/api/src/__tests__/event-bus.test.ts
    - apps/api/src/__tests__/graph-payload.test.ts
    - apps/api/src/__tests__/export-data.test.ts
    - apps/api/src/__tests__/phase2-routes.test.ts
  modified:
    - apps/api/src/app.ts
    - apps/api/src/routes/cards.ts
    - apps/api/src/services/apply-proposal.ts
    - apps/api/src/routes/ai.ts

key-decisions:
  - "Route-level middleware instead of sub-app use('*') for the three new sub-apps: Hono flattens app.route() sub-app routes into the parent router, so a use('*') gate on graphRoutes would intercept export/events requests and return 401 before the export format check (verified empirically); per-route middleware preserves the plan's acceptance criteria exactly"
  - "Export format validated in a path-scoped middleware registered before the auth gate so format=exe returns 400 without a session while format=csv returns 401 (matches phase2-routes.test.ts contract)"
  - "Session user name comes from auth.api.getSession().user.name — confirmed required string on the Better Auth session type, no DB fallback query needed"
  - "Event bus is module-level in-process Map<string, Set<handler>>; publish is a no-op with zero subscribers; handler exceptions logged via @workspace/logger without breaking the dispatch loop"

patterns-established:
  - "In-process project-keyed pub/sub (event-bus.ts) as the SSE backbone until a cross-node transport is needed"
  - "Deterministic graph edge ids are the DB key pairs '{source}--{target}' — relation rows overwrite same-id containment edges (documented precedence)"

requirements-completed: [DATA-04, UI-06]

# Metrics
duration: 222min
completed: 2026-08-02
---

# Phase 02 Plan 01: Graph, SSE, and Export API Data Layer Summary

**Org-scoped graph payload endpoint, SSE live-events stream, and CSV/JSON/Markdown export endpoint backed by an in-process project-keyed event bus that broadcasts card/comment/proposal mutations from the existing card, proposal-approval, and AI routes.**

## Performance

- **Duration:** 222 min
- **Started:** 2026-08-02T09:13:48Z
- **Completed:** 2026-08-02T12:56:37Z
- **Tasks:** 3 (2 TDD + 1 wiring)
- **Files modified:** 14 (10 created, 4 modified)

## Accomplishments

- **Graph payload endpoint** (`GET /api/projects/:slug/graph`) — pure `buildGraphPayload` maps epics (childCount computed), cards (open+closed), containment hierarchy edges (card→epic, epic→parent-epic), and relation edges (dependency/hierarchy/evolution) with deterministic `${source}--${target}` ids. All queries org-scoped via `c.var.projectId` from `resolveOrgFromProject`; node ids are DB primary keys → `graph-node-{id}` data-testid contract for the frontend.
- **SSE live-events endpoint** (`GET /api/projects/:slug/events`) — native `ReadableStream` with per-project subscription, `event: {type}\ndata: {payload}\n\n` framing, 25s heartbeat, and cleanup on abort/cancel. Only org members reach stream creation (401/403 from middleware).
- **Export endpoint** (`GET /api/projects/:slug/export?format=csv|json|md`) — `buildExportData` (Drizzle queries) + pure serializers: `toCsv` (RFC-style quoted/escaped fields, CRLF, relation target columns), `toJson` (full graph payload + meta), `toMarkdown` (epic sections, Uncategorized, Relations). Content-Disposition attachment with slug-date filename.
- **Broadcast wiring** — 10 publish sites: 4 in `cards.ts` (create/update/close/comments), 3 in `apply-proposal.ts` (create/update/close branches), 3 in `ai.ts` (generate/process/clarify → proposal.ready). Comment payload carries `userName` resolved from the session.
- **Verified end-to-end** — SSE stream delivers a broadcast `comment.created` frame with `userName`; cross-org isolation proven with a live session: User A sees only org A rows (200), User B with the same project slug gets 403, no leakage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Event bus + graph payload builder (TDD)** — `1006bfe` (test: RED) → `202a540` (feat: GREEN)
2. **Task 2: Graph, SSE, and export routes (TDD)** — `97ece03` (feat: tests written first, verified failing, then implementation — committed together)
3. **Task 3: Broadcast wiring** — `3d420de` (feat)

**Plan metadata:** `docs(02-01)` (pending — this SUMMARY commit)

## Files Created/Modified

- `apps/api/src/services/event-bus.ts` - `publish`/`subscribe` + `ProjectEvent` union (comment.created, card.created, card.updated, proposal.ready)
- `apps/api/src/services/graph-payload.ts` - pure `buildGraphPayload(epics, cards, relations)` → `{ nodes, edges }` with `GraphNode`/`GraphEdge` types
- `apps/api/src/services/export-data.ts` - `buildExportData`/`buildExportDataFromRows` + `toCsv`/`toJson`/`toMarkdown` serializers
- `apps/api/src/routes/graph.ts` - `graphRoutes`, GET `/:slug/graph`
- `apps/api/src/routes/events.ts` - `eventsRoutes`, GET `/:slug/events` SSE stream
- `apps/api/src/routes/export.ts` - `exportRoutes`, GET `/:slug/export` with format middleware
- `apps/api/src/app.ts` - mounted graphRoutes/eventsRoutes/exportRoutes at `/api/projects` after projectsRoutes
- `apps/api/src/routes/cards.ts` - 4 publish sites (POST /, PATCH /:id, POST /:id/close, POST /:id/comments)
- `apps/api/src/services/apply-proposal.ts` - 3 publish sites (create/update/close branches); `applyClose` now receives `projectId`
- `apps/api/src/routes/ai.ts` - 3 publish sites (generate/process/clarify → proposal.ready)
- `apps/api/src/__tests__/event-bus.test.ts` - delivery, unsubscribe, project isolation, handler error resilience, zero-subscriber no-op
- `apps/api/src/__tests__/graph-payload.test.ts` - node mapping, containment + parent-epic edges, relation passthrough, childCount
- `apps/api/src/__tests__/export-data.test.ts` - CSV escaping (comma/quote/newline), JSON round-trip + shape, Markdown titles + closed flag
- `apps/api/src/__tests__/phase2-routes.test.ts` - 401 on graph/events/export without session, 400 on invalid format

## Decisions Made

1. **Route-level middleware for the three new sub-apps** — the plan said `use("*", resolveOrgFromProject)` (copied from cards.ts), but Hono's `app.route()` flattens sub-app routes into the parent router: a `use("*")` on graphRoutes registers `ALL /api/projects/*` and intercepts export/events requests, returning 401 before the export format middleware could produce the plan-required 400. Verified empirically with a 3-sub-app reproduction; per-route middleware (`get("/:slug/graph", resolveOrgFromProject, handler)`) preserves the exact acceptance criteria. Security posture unchanged — resolveOrgFromProject still gates every route.
2. **Format validation before the auth gate** — a path-scoped `exportRoutes.use("/:slug/export", ...)` validates `format` via `z.enum(["csv","json","md"])` before `resolveOrgFromProject`, so invalid format → 400 regardless of session (per phase2-routes.test.ts), valid format + no session → 401.
3. **`session.user.name` confirmed on the Better Auth session type** — a type probe confirmed `name` is a required string on `auth.api.getSession().user`, so the comment broadcast uses it directly (plan asked to verify; no DB fallback query required).
4. **Module-level event bus** — simplest correct backbone for a single-node dev/postgres deployment; per-project isolation via keyed `Map`; throwing handlers logged without breaking the loop; zero-subscriber publish is a no-op.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sub-app `use("*")` middleware intercepts sibling sub-app requests**

- **Found during:** Task 2 (route-gate tests)
- **Issue:** The plan directed `use("*", resolveOrgFromProject)` on each new sub-app (cards.ts pattern). Hono's `app.route()` copies sub-app routes into the parent with base paths, so graphRoutes' `ALL /api/projects/*` auth gate ran before exportRoutes' format check — `format=exe` returned 401 instead of the required 400. Reproduced with a minimal 3-sub-app test.
- **Fix:** Applied `resolveOrgFromProject` as route-level middleware on `graphRoutes.get("/:slug/graph", ...)`, `eventsRoutes.get("/:slug/events", ...)`, `exportRoutes.get("/:slug/export", ...)`, and registered the format check as path-scoped `use("/:slug/export", ...)` before the gate.
- **Files modified:** apps/api/src/routes/graph.ts, events.ts, export.ts
- **Verification:** phase2-routes.test.ts passes (401×3 + 400); manual smoke confirms 401/400 matrix; SSE + graph still gate unauthenticated requests
- **Committed in:** 97ece03

**2. [Rule 3 - Blocking] Session token cookie must be HMAC-signed to authenticate test sessions**

- **Found during:** Task 2 manual cross-org isolation verification
- **Issue:** Seeded Better Auth session rows + raw cookie returned 401 — `auth.api.getSession` verifies the `better-auth.session_token` cookie signature (HMAC-SHA256 over the token, base64) before DB lookup.
- **Fix:** Constructed signed cookies in the verification harness (`token.signature` via `createHmac("sha256", secret)`), enabling a real end-to-end isolation check: A→200 (own rows only), B (same slug, other org)→403.
- **Files modified:** none (test harness only)
- **Verification:** cross-org spot check passed; no code change required
- **Committed in:** n/a (harness removed)

**3. [Rule 1 - Bug] Test fixture type widening broke `bun --filter api typecheck`**

- **Found during:** Task 1 GREEN (typecheck)
- **Issue:** The graph-payload test fixture inferred `priority: string` (widened from the literal union), failing `CardInput` type compatibility.
- **Fix:** Annotated fixture arrays with explicit types (`priority: "low" | "medium" | "high" | "critical"`, `type: "dependency" | "evolution"`, etc.).
- **Files modified:** apps/api/src/**tests**/graph-payload.test.ts
- **Verification:** typecheck passes
- **Committed in:** 202a540

**4. [Rule 1 - Bug] Export-data test assertions didn't match serializer contract**

- **Found during:** Task 2 GREEN (test run)
- **Issue:** `toCsv` correctly joins multi-value fields with `; ` (plan spec) so the escaped acceptance-criteria field is `"AC one; AC ""two"""` not `"AC ""two"""`; the Markdown relations line uses card-1's actual fixture title `Card, "Quoted"` not a placeholder "Card One".
- **Fix:** Corrected the two assertions to the real contract output.
- **Files modified:** apps/api/src/**tests**/export-data.test.ts
- **Verification:** all export-data tests pass
- **Committed in:** 97ece03

---

**Total deviations:** 4 auto-fixed (3 blocking/correctness, 1 test-fixture)
**Impact on plan:** All fixes were necessary to satisfy the plan's own acceptance criteria exactly. No scope creep; the route-middleware change keeps the same org-scope security model.

## TDD Gate Compliance

- **Task 1:** RED `1006bfe` (test) → GREEN `202a540` (feat) — clean two-commit gate. Tests failed with "Cannot find module" before implementation existed.
- **Task 2:** Tests were written first and verified failing (3 failures: toCsv assertion, toMarkdown assertion, format=exe 401) before implementation, then implementation + corrected tests committed together as `97ece03`. The RED and GREEN phases are in one commit rather than two — the RED-failing state was demonstrated but not separately committed. Functionally equivalent coverage; flagged for transparency.
- **Task 3:** Not TDD-tagged; wiring verified by call-site grep (4/3/3) + full suite.

## Issues Encountered

- **Hono sub-app middleware flattening** — the single most time-consuming issue (see deviation 1). `app.route()` copies sub-app routes (including `use("*")`) into the parent router; sibling sub-apps at a shared prefix interfere. Diagnosed with isolated reproductions before choosing route-level middleware.
- **Better Auth signed cookie** — `auth.api.getSession` requires a signed `better-auth.session_token` cookie; raw DB tokens don't authenticate (by design). Needed only for the manual cross-org verification harness, not for the shipped code.
- **commitlint body-max-line-length** — the first RED commit message body exceeded 100 chars/line and was rejected by the husky hook; rewrote the body in shorter lines.
- **Transient test failure at baseline** — one orgs/invite test failed on the first `bun --filter api test` run (likely rate-limiter timing); 4 subsequent runs were fully green (15/15 baseline, 32/32 final). No action needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three endpoints (graph, SSE, export) are live with the UI-SPEC contracts and org-scope enforcement — ready for 02-02 (frontend graph view), 02-03 (live comments), 02-04 (client SSE parsing).
- The event-bus `ProjectEvent` union is the wire contract the frontend SSE parser consumes (`event: comment.created` etc.).
- Graph node ids double as the `graph-node-{id}` data-testid contract for the graph view.
- Export filename uses `{project.slug}-{YYYY-MM-DD}.{ext}` — stable contract for download UX.

## Self-Check: PASSED

- All 10 created files exist on disk (services, routes, tests, SUMMARY)
- All 4 commits verified in git history: `1006bfe` (RED), `202a540` (GREEN), `97ece03`, `3d420de`
- `bun --filter api typecheck` — exit 0
- `bun --filter api lint` — exit 0
- `bun --filter api test` — 32 pass, 0 fail
- `grep export default` in new services/routes — 0 matches
- Cross-org isolation spot check — PASSED (A sees own rows 200, B gets 403)
- SSE broadcast spot check — PASSED (comment.created frame delivered with userName)

---

_Phase: 02-graph-collaboration-depth_
_Completed: 2026-08-02_
