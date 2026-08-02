---
phase: 02-graph-collaboration-depth
plan: 03
subsystem: ui
tags: [xyflow, dagre, graph, impact, lazy-loading, react]

# Dependency graph
requires:
  - phase: 02-01
    provides: org-scoped GET /api/projects/:slug/graph payload (GraphNode/GraphEdge contract, node ids = DB PKs)
  - phase: 02-02
    provides: @xyflow/react@12.11.2 + @dagrejs/dagre@1.1.8 pins, --color-edge-* oklch tokens, ViewSwitcher, toggle/toggle-group shadcn primitives
provides:
  - Interactive graph view (pan/zoom/fitView/drag) rendering epics + cards as dagre-laid-out custom nodes with color-coded edges
  - Client-side edge-type filter toggles (dependency/hierarchy/evolution) that recompute connected node sets without refetch
  - Impact of X mode: reverse-direction dependency traversal highlights a card + all transitive downstream dependents (ring-2 ring-primary), dims the rest, opens the CardDrawer on click
  - Empty and error states with UI-SPEC copy and graph-empty-cta / graph-retry testids
  - Lazy-loaded Graph tab chunk shipped only when ?view=graph is opened
affects:
  [
    02-04 comments/SSE wiring,
    02-05 export wiring,
    E2E-02 journey J1 (graph assertions),
  ]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom React Flow node/edge components: nodeTypes/edgeTypes maps defined outside the component for stable identity; GraphNode/GraphEdge payload passed through the data field with isImpacted/dimmed overlay flags"
    - "Edge stroke driven by CSS variables (--xy-edge-stroke, --xy-edge-stroke-width) that React Flow's .react-flow__edge-path rule consumes — unlayered library CSS would otherwise override Tailwind utilities; group-hover class sets the width var on the path for hover 2.5 (impacted edges skip the hover class so 3 wins)"
    - "dagre deterministic layout (rankdir TB, per-kind node sizes epic 160x64 / card 140x60) produces stable coordinates for E2E assertions — no force simulation"
    - "Client-side impact computation in a pure, tested lib (computeImpact) with reverse-direction BFS over dependency edges only; hierarchy/evolution edges excluded from traversal but included in edgeIds when both endpoints are impacted"
    - "React.lazy with named-export mapping: lazy(() => import(...).then(m => ({ default: m.GraphView }))) — the repo bans default exports, so the lazy route maps the named export"
    - "Shared non-component constants live in lib/ (priorityClasses → lib/priority.ts): react-refresh/only-export-components rejects exporting constants from component files"

key-files:
  created:
    - apps/web/src/hooks/use-graph.ts
    - apps/web/src/lib/impact.ts
    - apps/web/src/lib/__tests__/impact.test.ts
    - apps/web/src/hooks/__tests__/use-graph.test.tsx
    - apps/web/src/components/graph-node.tsx
    - apps/web/src/components/graph-edge.tsx
    - apps/web/src/components/graph-canvas.tsx
    - apps/web/src/components/graph-toolbar.tsx
    - apps/web/src/components/graph-view.tsx
    - apps/web/src/lib/priority.ts
  modified:
    - apps/web/src/components/board-card.tsx
    - apps/web/src/routes/project-board.tsx

key-decisions:
  - "Edge hover stroke (2.5) implemented with CSS group-hover on --xy-edge-stroke-width because React Flow v12 exposes no hoveredEdges store selector; inline CSS vars beat the library's unlayered .react-flow__edge-path rule where Tailwind utilities would lose"
  - "priorityClasses moved from board-card.tsx to lib/priority.ts: the plan required importing the map (not duplicating it), and react-refresh/only-export-components forbids exporting a constant from a component file"
  - "data-impact='true' attribute added to impacted node roots to satisfy the UI-SPEC E2E anchor table (J1 asserts data-impact='true' count > 1)"
  - "GraphView verified to split into its own ~231KB lazy chunk (dagre + xyflow); board landing bundle unchanged"

requirements-completed: [UI-06]

# Metrics
duration: 35min
completed: 2026-08-02
---

# Phase 02 Plan 03: Interactive Graph View Summary

**Dagre-laid-out interactive graph (pan/zoom/fitView/drag) with custom epic/card nodes, type-colored dependency/hierarchy/evolution edges, client-side edge filter toggles, and an Impact-of-X mode that highlights a card plus all its transitive downstream dependents via a pure reverse-traversal computation — integrated into the project board as a lazy-loaded Graph tab.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-02T13:26:17Z
- **Completed:** 2026-08-02T14:01:10Z
- **Tasks:** 3 (1 TDD + 2 feature)
- **Files modified:** 12 (10 created, 2 modified)

## Accomplishments

- **Graph data hook + pure impact engine (TDD):** `useGraph(projectSlug)` mirrors the `use-cards` pattern (queryKey `["project", slug, "graph"]`, apiClient fetch, `enabled: Boolean(slug)`); `computeImpact` (lib/impact.ts, zero React imports) does reverse-direction BFS over dependency edges only — hierarchy/evolution edges are never traversed for reachability but join `edgeIds` when both endpoints are impacted — with null-safe empty sets and convenience array forms. 10 tests cover direct/transitive chains, hierarchy/evolution exclusion, self-only, and null selection.
- **Custom node + edge components:** `GraphNodeComponent` renders epic (160px, `border-2 border-foreground/20`, Layers icon, "{n} stories" badge) and card (140px, priority chip reusing `priorityClasses`, dashed border + Lock for closed) shapes with the UI-SPEC impact styling contract (impacted → `ring-2 ring-primary border-primary`, dimmed → `opacity-25`) and `graph-node-{id}` testids; `GraphEdgeComponent` renders type-colored smooth-step paths (borderRadius 5) via `--xy-edge-stroke` CSS vars, per-type arrow markers, idle 1.5 / hover 2.5 / impacted 3 stroke widths, and `graph-edge-{source}--{target}` + `data-edge-type` testids.
- **Canvas, toolbar, view, and board integration:** `GraphCanvas` (ReactFlow + Controls, fitView padding 32, card-only click routing, defs for the three arrow markers); `GraphToolbar` (three `edge-filter-*` toggles, `impact-toggle`, edge-token legend chips, impact hint); `GraphView` (dagre TB layout with deterministic per-kind positions, client-side filter → connected-node recompute keeping epics always visible, impact overlay + banner + Clear, empty/error states); `project-board.tsx` renders ViewSwitcher above the board and swaps the Kanban+ClosedRail grid for the lazy Suspense-wrapped GraphView when `?view=graph`.
- **Verified end-to-end:** full suite 220 tests green (210 baseline + 10 new), `bun --filter web build` passes with the graph chunk code-split (231.73 kB lazy), repo lint + typecheck 12/12, dev server smoke test returned 200 with the lazy chunk served on demand.

## Task Commits

Each task was committed atomically:

1. **Task 1: use-graph hook + pure impact computation (TDD)** - `3c425ff` (test: RED) → `2786b63` (feat: GREEN)
2. **Task 2: Custom graph node and edge components** - `01e3d50` (feat)
3. **Task 3: graph-canvas, graph-toolbar, graph-view, and board integration** - `228429f` (feat)

**Plan metadata:** pending (this SUMMARY commit)

## Files Created/Modified

- `apps/web/src/hooks/use-graph.ts` - `useGraph` hook + `GraphNode`/`GraphEdge` types matching the 02-01 API contract
- `apps/web/src/lib/impact.ts` - pure `computeImpact(nodes, edges, selectedId)` reverse-direction BFS
- `apps/web/src/lib/__tests__/impact.test.ts` - 8 tests (traversal semantics, exclusion rules, null safety, convenience arrays)
- `apps/web/src/hooks/__tests__/use-graph.test.tsx` - 2 tests (query key via cache, enabled gating)
- `apps/web/src/components/graph-node.tsx` - custom epic/card node with impact/dim styling, `graph-node-{id}` + `data-impact`
- `apps/web/src/components/graph-edge.tsx` - type-colored BaseEdge, `graph-edge-{src}--{tgt}` + `data-edge-type`
- `apps/web/src/components/graph-canvas.tsx` - ReactFlow wrapper, Controls, arrow-marker defs, `graph-canvas` testid
- `apps/web/src/components/graph-toolbar.tsx` - edge filters + impact toggle + legend
- `apps/web/src/components/graph-view.tsx` - lazy container: fetch, dagre layout, filters, impact, states
- `apps/web/src/lib/priority.ts` - shared `priorityClasses` map (extracted from board-card for lint compliance)
- `apps/web/src/components/board-card.tsx` - imports priorityClasses from lib/priority (behavior unchanged)
- `apps/web/src/routes/project-board.tsx` - ViewSwitcher row + lazy GraphView render on `?view=graph`

## Decisions Made

1. **Edge hover via CSS vars, not a store selector** — React Flow v12 exposes no `hoveredEdges` in its store, so hover stroke-width 2.5 is a `group-hover` class setting `--xy-edge-stroke-width` on the path; impacted edges drop the hover class so the impacted 3 always wins.
2. **Inline CSS vars over Tailwind stroke utilities** — React Flow's `style.css` is unlayered, so its `.react-flow__edge-path { stroke: var(--xy-edge-stroke) }` rule beats Tailwind's layered `stroke-edge-*` utilities in the cascade; setting the vars inline is the only robust path.
3. **priorityClasses extracted to `lib/priority.ts`** — the plan demanded reuse (import, not duplicate), but the repo's `react-refresh/only-export-components` lint rule forbids exporting a constant from a component file; the lib module satisfies both.
4. **`data-impact` attribute added** — the UI-SPEC E2E anchor table requires `data-impact="true"` on impacted nodes for the J1 journey; the plan's must-haves listed the impact ring/dim contract but not this attribute, so it was added to match the approved UI-SPEC exactly.
5. **Named-export lazy mapping** — the repo bans default exports, so `React.lazy(() => import(...).then(m => ({ default: m.GraphView })))` bridges React.lazy's default-export requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `priorityClasses` was not exported from board-card.tsx, and exporting it directly breaks the react-refresh lint rule**

- **Found during:** Task 2 (graph-node.tsx import + Task 3 lint gate)
- **Issue:** The plan required importing the existing `priorityClasses` map verbatim, but it was a module-private `const`; adding `export` triggered `react-refresh/only-export-components` ("Fast refresh only works when a file only exports components").
- **Fix:** Extracted the map to `apps/web/src/lib/priority.ts` and imported it from both `board-card.tsx` and `graph-node.tsx` — reuse without duplication, lint-clean.
- **Files modified:** apps/web/src/lib/priority.ts (new), board-card.tsx, graph-node.tsx
- **Verification:** `bun --filter web lint` exit 0; grep `priorityClasses` in graph-node.tsx ≥1
- **Committed in:** 01e3d50 (Task 2), 228429f (Task 3)

**2. [Rule 1 - Bug] `use-graph.test.ts` failed husky prettier because JSX in a `.ts` file is a syntax error**

- **Found during:** Task 1 RED commit (pre-commit hook)
- **Issue:** The plan named the test `use-graph.test.ts`, but it renders JSX (QueryClientProvider wrapper), which prettier rejects in `.ts`; the existing hook tests follow the `.tsx` convention (use-user.test.tsx).
- **Fix:** Renamed to `use-graph.test.tsx` via `git mv`.
- **Files modified:** apps/web/src/hooks/**tests**/use-graph.test.tsx
- **Verification:** pre-commit prettier passes; test suite green
- **Committed in:** 3c425ff (Task 1 RED)

**3. [Rule 1 - Bug] `result.current.queryKey` is undefined on TanStack Query v5.101 observer results**

- **Found during:** Task 1 GREEN (test run)
- **Issue:** The plan's test spec said to assert the query key via the hook result, but v5 `QueryObserverResult` does not expose `queryKey` on the result object.
- **Fix:** Asserted the key through the QueryClient cache: `queryClient.getQueryCache().findAll().map(q => q.queryKey)` contains `["project", "demo", "graph"]`; disabled-slug assertion checks `fetchStatus === "idle"`, cache contains `["project", undefined, "graph"]`, and apiClient was never called.
- **Files modified:** apps/web/src/hooks/**tests**/use-graph.test.tsx
- **Verification:** 2/2 hook tests pass
- **Committed in:** 2786b63 (Task 1 GREEN)

**4. [Rule 3 - Blocking] `bun --filter web typecheck` is a no-op (empty `files: []` tsconfig); `bun --filter web build` (tsc -b) surfaced 7 stricter type errors**

- **Found during:** Task 3 (plan verification `bun --filter web typecheck && bun --filter web build`)
- **Issue:** The web workspace root tsconfig has `files: []` with project references, so `tsc --noEmit` checks nothing; `tsc -b` (via build) is the real gate and rejected: `NodeProps<{data: ...}>`/`EdgeProps<{data: ...}>` not satisfying the `Node`/`Edge` constraints, CSS custom-property keys (`--xy-edge-stroke`) not in React 19's closed `CSSProperties`, and `React.lazy` requiring a default export while the module only has the named `GraphView`.
- **Fix:** Typed the components with `NodeProps<GraphFlowNode>` / `EdgeProps<GraphFlowEdge>` where `GraphFlowNode = Node<GraphNodeData>` / `GraphFlowEdge = Edge<GraphEdgeData>`; cast the edge style object as `CSSProperties & Record<string, string | number | undefined>`; mapped the named export through `lazy(() => import(...).then(m => ({ default: m.GraphView })))`.
- **Files modified:** graph-node.tsx, graph-edge.tsx, project-board.tsx
- **Verification:** `bun --filter web build` exit 0; lazy chunk split confirmed (graph-view-\*.js)
- **Committed in:** 228429f (Task 3)

**5. [Rule 2 - Missing Critical] `data-impact` attribute absent from node roots (UI-SPEC E2E anchor contract)**

- **Found during:** Task 3 (final grep pass against UI-SPEC E2E anchors)
- **Issue:** The UI-SPEC E2E anchors table requires `data-impact="true"` on impacted nodes for journey J1 (`assert data-impact="true" count > 1`); the plan's must-haves covered the visual ring/dim but not this attribute.
- **Fix:** Added `data-impact={isImpacted ? "true" : "false"}` to the node root div.
- **Files modified:** apps/web/src/components/graph-node.tsx
- **Verification:** `bun --filter web build` exit 0; grep `data-impact` in graph-node.tsx ≥1
- **Committed in:** 228429f (Task 3)

---

**Total deviations:** 5 auto-fixed (2 blocking, 2 bugs, 1 missing critical)
**Impact on plan:** All fixes were required for the plan's own acceptance criteria and the APPROVED UI-SPEC contract to hold (lint gate, typecheck gate, E2E anchor). No scope creep; the priorityClasses extraction is a pure refactor preserving behavior.

## TDD Gate Compliance

- **Task 1:** RED `3c425ff` (test) → GREEN `2786b63` (feat) — clean two-commit gate. RED verified failing (both suites failed with "Cannot find module" for the not-yet-existing implementation) before GREEN.

## Issues Encountered

- **Web tests must run from the repo root, not `bun --filter web test`** — the plan's `<verify>` used `bun --filter web test -- --run <files>`, but running vitest from the web workspace bypasses the root vitest.config.ts (jsdom + setup), failing the hook test with "document is not defined". This is the repo constraint documented in 01-06 and 02-02. Ran the same files from root (`bun run test -- <paths>`) — 10/10 green — plus the full 220-test suite.
- **React 19 @types/react closed CSSProperties** — the index signature for CSS custom properties was deliberately removed; the `as CSSProperties & Record<...>` cast is the documented workaround.
- **React Flow v12 a11y:** node click and Enter/Space keyboard handling are wired by the library's NodeWrapper on the wrapper div, so the custom node's inner `role="button" tabIndex={0}` div relies on event bubbling to satisfy the UI-SPEC a11y contract — verified via the library's `onSelectNodeHandler` / `elementSelectionKeys` behavior.

## Known Stubs

None — all rendered state is wired: nodes/edges come from the graph query, filters/impact are live client state, empty/error states render real payload-derived conditions.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes. `dangerouslySetInnerHTML` grep across apps/web returns 0 (T-02-21 re-checked); the graph view renders only server-typed React text children; malformed payloads fail the query (apiClient throws on non-ok) and surface the error state (T-02-23 disposition met). The lazy graph chunk is a client-side code-split, not a dynamic remote import.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 02-04 (comments/SSE wiring):** graph view is self-contained behind `?view=graph`; board header/drawer/ProposalReview untouched on both tabs; project-board.tsx now owns the ViewSwitcher render (02-04 adds export menu + live indicator to the Board toolbar without conflict).
- **E2E-02 J1 (graph journey) can be written:** all anchors present — `view-switcher-*`, `graph-canvas`, `graph-node-{id}` + `data-impact`, `graph-edge-{src}--{tgt}` + `data-edge-type`, `edge-filter-*`, `impact-toggle`/`impact-banner`/`impact-clear`, `graph-empty-cta`, `graph-retry`. Dagre positions are deterministic, so edge-count and data-edge-type assertions are stable.
- Filter toggles and impact mode are pure client state — the E2E can toggle, assert instant edge counts, and click a card to open the drawer without refetch.

## Self-Check: PASSED

- All 10 created files + SUMMARY verified present on disk
- All 4 task commits verified in git history: `3c425ff` (RED), `2786b63` (GREEN), `01e3d50`, `228429f`
- `bun --filter web typecheck` — exit 0
- `bun --filter web build` — exit 0 (lazy graph-view chunk code-split, 231.73 kB)
- `bun --filter web lint` — exit 0 (react-refresh rule fixed via priority.ts extraction)
- `bun run test` (root) — 45 files / 220 tests pass (210 baseline + 10 new)
- `bun run lint` / `bun run typecheck` (all 12 workspaces) — 12/12 pass
- grep `dangerouslySetInnerHTML` in apps/web — 0 matches
- grep `export default` in all 7 new modules — 0 matches
- Dev server smoke test: `?view=graph` route 200, lazy chunk serves as text/javascript

---

_Phase: 02-graph-collaboration-depth_
_Completed: 2026-08-02_
