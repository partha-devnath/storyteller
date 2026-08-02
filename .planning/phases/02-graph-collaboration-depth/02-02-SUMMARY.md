---
phase: 02-graph-collaboration-depth
plan: 02
subsystem: ui
tags:
  [
    xyflow,
    dagre,
    shadcn,
    tabs,
    dropdown-menu,
    tooltip,
    sse,
    eventsource,
    export,
    react,
  ]

# Dependency graph
requires:
  - phase: 02-graph-collaboration-depth
    provides: 02-01 data layer (graph/SSE/export routes, event bus, SSE broadcast)
  - phase: 01-core-loop-mvp-differentiator
    provides: frontend core (hooks, app shell, kanban, card drawer, vitest pattern)
provides:
  - 10 shadcn primitives (tabs, toggle, toggle-group, dropdown-menu, tooltip, textarea, avatar, badge, separator, popover)
  - 3 edge color tokens (edge-dependency amber, edge-hierarchy sky, edge-evolution violet) with .dark overrides
  - ViewSwitcher, ExportMenu, LiveIndicator chrome components with UI-SPEC testids
  - useExport (blob download) and useProjectEvents (EventSource wrapper) hooks
  - 12 component tests for the three chrome components
affects:
  [
    02-03 graph view,
    02-04 comments/SSE wiring,
    02-05 export wiring,
    e2e journeys,
  ]

# Tech tracking
tech-stack:
  added:
    - "@xyflow/react@12.11.2 (exact)"
    - "@dagrejs/dagre@1.1.8 (exact)"
    - "10 shadcn v4 + Base UI primitives from official registry"
    - "3 oklch edge-color tokens in globals.css @theme inline"
  patterns:
    - "Base UI render-prop composition (DropdownMenuTrigger render=<Button/>, TooltipTrigger render=<span/>)"
    - "react-hooks/set-state-in-effect: EventSource callbacks own setState, never the effect body"
    - "react-hooks/refs: latest-handlers via useEffect-updated ref, not render-phase assignment"
    - "EventSource reconnect via nonce state re-running the effect"

key-files:
  created:
    - apps/web/src/components/view-switcher.tsx
    - apps/web/src/components/export-menu.tsx
    - apps/web/src/components/live-indicator.tsx
    - apps/web/src/hooks/use-export.ts
    - apps/web/src/hooks/use-project-events.ts
    - apps/web/src/components/__tests__/view-switcher.test.tsx
    - apps/web/src/components/__tests__/export-menu.test.tsx
    - apps/web/src/components/__tests__/live-indicator.test.tsx
  modified:
    - apps/web/package.json
    - packages/ui/src/styles/globals.css
    - packages/ui/src/components/{tabs,toggle,toggle-group,dropdown-menu,tooltip,textarea,avatar,badge,separator,popover}.tsx
    - packages/ui/src/__tests__/utils.test.ts

key-decisions:
  - "Pinned @dagrejs/dagre to 1.1.8 (UI-SPEC locks 1.x) instead of resolver's default 3.0.0; v3 is a re-export/breaking fork of dagre 1.x"
  - "Installed toggle-group (available in registry) so later plans use ToggleGroup, not two toggles"
  - "useProjectEvents surfaces 'closed' on EventSource error and relies on native auto-reconnect (no manual EventSource recreation)"
  - "Disabled ExportMenu wraps the disabled Button in a span TooltipTrigger so pointer events still reach the tooltip (disabled buttons swallow hover)"
  - "All EventSource setState confined to callbacks to satisfy react-hooks/set-state-in-effect"

patterns-established:
  - "Edge colors are data-encoding tokens (like chart-1..5) referenced through @theme inline vars with :root/.dark definitions — NOT part of the 60/30/10 budget"
  - "Chrome components are self-contained, state-owning (ViewSwitcher owns ?view= param); routes consume them"
  - "Component tests mock react-router via vi.mock and drive Base UI popups with userEvent (pointer events), not fireEvent"

requirements-completed: [UI-06, DATA-04]

# Metrics
duration: 12min
completed: 2026-08-02
---

# Phase 2 Plan 2: Frontend Foundation Wave — Graph Deps, shadcn Primitives, Edge Tokens, Board Chrome Summary

**Pinned @xyflow/react@12.11.2 + @dagrejs/dagre@1.1.8 exact, installed 10 shadcn v4 primitives from the official registry, added 3 oklch edge-color tokens with .dark overrides, and built view-switcher, export-menu, live-indicator + use-export and use-project-events hooks — all with passing component tests.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-02T13:03:55Z
- **Completed:** 2026-08-02T13:15:19Z
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Graph deps pinned exact at the UI-SPEC majors (v12 + dagre 1.x) — no transitive registry surprises; install log reviewed
- All 10 shadcn primitives present from the official shadcn registry (tabs, toggle, toggle-group, dropdown-menu, tooltip, textarea, avatar, badge, separator, popover) — Tailwind classes `stroke-edge-dependency`, `text-edge-hierarchy`, `border-edge-evolution` now compile
- ViewSwitcher drives Board/Graph tabs from `?view=` (default board) with UI-SPEC testids `view-switcher-board` / `view-switcher-graph`
- ExportMenu renders the CSV/JSON/Markdown DropdownMenu (`export-csv` / `export-json` / `export-markdown`) with a disabled+Tooltip state
- LiveIndicator renders connecting/open/closed states with `data-status` and a Retry button
- useExport triggers blob downloads with Content-Disposition filename fallback + isExporting state; useProjectEvents opens an EventSource with status tracking, narrow query invalidation, and malformed-payload guard
- 12 new component tests pass; full suite green (210 tests / 43 files)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin graph deps, add shadcn primitives, add edge color tokens** - `5adca94` (feat)
2. **Task 2: Chrome components + hooks (view-switcher, export-menu, live-indicator, use-export, use-project-events)** - `aa5f68a` (feat)
3. **Task 3: Component tests for view-switcher, export-menu, live-indicator** - `c86b1ee` (test, incl. export-menu disabled-tooltip fix)

## Files Created/Modified

- `apps/web/package.json` - Added `@xyflow/react@12.11.2` + `@dagrejs/dagre@1.1.8` exact pins
- `packages/ui/src/styles/globals.css` - Added `--color-edge-*` in @theme inline + `--edge-*` in :root and .dark (UI-SPEC oklch values)
- `packages/ui/src/components/*.tsx` - 10 shadcn CLI-generated primitives (tabs, toggle, toggle-group, dropdown-menu, tooltip, textarea, avatar, badge, separator, popover)
- `apps/web/src/components/view-switcher.tsx` - Tabs control reading/writing `?view=` param
- `apps/web/src/components/export-menu.tsx` - Export DropdownMenu with disabled+tooltip state
- `apps/web/src/components/live-indicator.tsx` - SSE status indicator with retry
- `apps/web/src/hooks/use-export.ts` - Blob download hook (credentials, Content-Disposition filename, object URL lifecycle)
- `apps/web/src/hooks/use-project-events.ts` - EventSource wrapper (status, invalidation, reconnect nonce, malformed payload guard)
- `apps/web/src/components/__tests__/view-switcher.test.tsx` - 3 tests (testids, default board, view param write)
- `apps/web/src/components/__tests__/export-menu.test.tsx` - 5 tests (trigger, disabled+tooltip, per-format onExport)
- `apps/web/src/components/__tests__/live-indicator.test.tsx` - 4 tests (status copy + data-status, retry click)
- `packages/ui/src/__tests__/utils.test.ts` - Fixed pre-existing `no-constant-binary-expression` lint error (`false && "hidden"` → hoisted variable)

## Decisions Made

- **dagre 1.x over resolver default:** The UI-SPEC locks `@dagrejs/dagre` 1.x; bun's resolver initially installed 3.0.0. Pinned `1.1.8` (latest 1.x) to honor the locked decision — 3.x is a separate major whose API/behavior differs.
- **toggle-group installed:** The registry had it, so later graph-filter plans can use `ToggleGroup` per UI-SPEC.
- **EventSource error → "closed" + native auto-reconnect:** The hook never manually recreates the EventSource; `reconnect()` re-runs the effect via a nonce (close + fresh EventSource).
- **Disabled tooltip trigger = span wrapper:** A disabled `<button>` swallows pointer events, so the TooltipTrigger wraps it in an `inline-flex` span (Base UI `render` prop) — matching the UI-SPEC "disabled with Tooltip" contract while keeping the Button itself disabled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] dagre resolver picked 3.0.0 instead of locked 1.x**

- **Found during:** Task 1 (dep install)
- **Issue:** `bun add @dagrejs/dagre` resolved to 3.0.0; plan/UI-SPEC lock 1.x and the acceptance criterion greps for a 1.x exact pin
- **Fix:** Re-pinned to `@dagrejs/dagre@1.1.8` (latest 1.x). The UI-SPEC "stop and report" gate is for an uninstallable/legitimacy problem; the locked major exists here, so pinning it is the correct resolution. No human checkpoint needed (package legitimacy pre-vetted in UI-SPEC, T-02-SC)
- **Files modified:** apps/web/package.json
- **Verification:** `grep '"@dagrejs/dagre"' apps/web/package.json` → `"1.1.8"` exact
- **Committed in:** 5adca94 (Task 1 commit)

**2. [Rule 3 - Blocking] Pre-existing lint error in packages/ui utils.test.ts blocked `bun run lint`**

- **Found during:** Task 1 (plan verification `bun run lint`)
- **Issue:** Template test file `packages/ui/src/__tests__/utils.test.ts` had `expect(cn("base", false && "hidden", ...))` — `no-constant-binary-expression` error. Pre-existing, but the plan's acceptance criteria require `bun run lint` to pass across workspaces
- **Fix:** Hoisted the constant into a variable (`const showHidden = false`) — preserves test semantics, satisfies the rule
- **Files modified:** packages/ui/src/**tests**/utils.test.ts
- **Verification:** `bun run lint` → 12/12 tasks pass
- **Committed in:** 5adca94 (Task 1 commit)

**3. [Rule 3 - Blocking] `bun --filter web test` bypasses root vitest config (no jsdom)**

- **Found during:** Task 2/3 (plan's `<verify>` commands `bun --filter web test -- --run`)
- **Issue:** Running vitest from the web workspace ignores the root `vitest.config.ts` (jsdom + setup), so component tests fail with "document is not defined". This was already documented in 01-06-SUMMARY
- **Fix:** Ran component tests from the repo root: `bun run test -- src/components/__tests__/...` — full suite 43 files / 210 tests green
- **Verification:** `bun run test` → 210 passed
- **Committed in:** n/a (test invocation, no code change)

**4. [Rule 1 - Bug] Disabled ExportMenu tooltip never opened (fireEvent.mouseEnter / pointerEnter no-op)**

- **Found during:** Task 3 (export-menu test)
- **Issue:** Base UI Tooltip listens for pointer events via floating-ui `useHoverReferenceInteraction`; a disabled `<button>` swallows hover, and even on a live button `fireEvent.mouseEnter` doesn't dispatch pointer events — tooltip content never mounted
- **Fix:** Wrapped the disabled Button in a span TooltipTrigger (`render={<span className="inline-flex" data-testid="export-menu-trigger" />}`) so pointer events reach the tooltip; tests drive it with `userEvent.hover` (dispatches pointerenter sequences)
- **Files modified:** apps/web/src/components/export-menu.tsx, apps/web/src/components/**tests**/export-menu.test.tsx
- **Verification:** export-menu suite 5/5 passes
- **Committed in:** c86b1ee (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking)
**Impact on plan:** All fixes necessary for correctness/verification. No scope creep — the dagre pin honors the UI-SPEC lock, the lint fix unblocks plan verification, and the tooltip fix is required for the UI-SPEC disabled-tooltip contract to actually function.

## Issues Encountered

- **react-hooks v7 React Compiler rules:** `react-hooks/set-state-in-effect` and `react-hooks/refs` rejected my first useProjectEvents implementation (setStatus in effect body + ref write during render). Resolved by confining all setState to EventSource callbacks and updating the handlers ref in a dedicated effect. This is a notable repo constraint for future hooks: **never call setState synchronously in an effect body; use callbacks/subscriptions.**
- **Web tests must run from the repo root** (`bun run test`), not `bun --filter web test` — root vitest.config.ts owns the jsdom environment. Already documented in 01-06; verified again here.

## Known Stubs

None — all components render real, wired state (ViewSwitcher reads ?view=, LiveIndicator renders its status prop, ExportMenu calls onExport; hooks have full fetch/EventSource logic).

## Threat Flags

None — all security-relevant surface (EventSource withCredentials, export blob fetch, npm installs) was already declared in the plan's threat model (T-02-SC, T-02-11..14). No new endpoints, auth paths, or schema changes introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 02-03 (graph view):** `@xyflow/react` + `@dagrejs/dagre` pinned exact; edge color tokens compile (`stroke-edge-*` / `text-edge-*` / `border-edge-*` classes resolve); ViewSwitcher provides the `?view=` tab state; toggle-group + toggle primitives available for edge filters
- **Ready for 02-04 (comments/SSE wiring):** useProjectEvents opens the `/events` EventSource with the exact event names and query invalidation keys from 02-01; LiveIndicator renders status for the board toolbar; textarea + avatar + badge + separator + popover primitives installed for comment-list/composer/mention-picker
- **Ready for 02-05 (export wiring):** useExport hits `/export?format=` with credentials + Content-Disposition filename; ExportMenu exposes csv/json/md callbacks with the disabled empty-board state
- 12 new tests cover the chrome contract; E2E-02 journeys (J1/J2/J3) can build on the `data-testid` anchors

---

_Phase: 02-graph-collaboration-depth_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 8 created files verified present on disk (5 modules + 3 test files)
- All 3 task commits verified in git log (5adca94, aa5f68a, c86b1ee)
- `bun run typecheck`: 12/12 tasks pass
- `bun run lint`: 12/12 tasks pass
- `bun run test`: 43 files / 210 tests pass (198 baseline + 12 new)
- `bun --filter web build`: passes (vite build succeeds)
- grep `font-medium` in 3 new components: 0 matches
- grep `export default` in 5 new modules: 0 matches
