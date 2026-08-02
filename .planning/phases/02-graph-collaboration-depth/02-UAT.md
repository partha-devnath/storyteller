---
status: complete
phase: 02-graph-collaboration-depth
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-08-02T17:39:18Z
updated: 2026-08-02T17:44:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test

expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch. Server boots without errors, any seed/migration completes, and a primary query (health check, homepage load, or basic API call) returns live data.
result: pass

### 2. View Switcher

expected: On the project board, a ViewSwitcher shows Board/Graph tabs. Default is Board. Clicking Graph switches to the graph view (URL gets ?view=graph). Clicking Board returns to kanban.
result: pass

### 3. Graph View Render

expected: Graph view renders epics (with "{n} stories" badge) and cards (with priority chip, Lock icon for closed) as custom nodes connected by color-coded edges: dependency=amber, hierarchy=sky, evolution=violet.
result: pass

### 4. Graph Interaction

expected: Graph canvas pans, zooms (scroll/fit), and supports fitView. Nodes are draggable. Clicking a card node opens the CardDrawer for that card.
result: pass

### 5. Edge Filter Toggles

expected: Toolbar has dependency/hierarchy/evolution filter toggles (and a legend). Toggling a type off removes those edges from the graph instantly (no page reload), keeping connected nodes visible.
result: skipped
reason: Deferred to automated E2E-02 J1 (12/12 E2E green); user advanced to Phase 3

### 6. Impact of X

expected: Toggling impact mode and clicking a card highlights that card plus all transitive downstream dependents (ring-2 ring-primary) and dims the rest. A banner shows impact info with a Clear button. Clicking a highlighted card opens the CardDrawer.
result: skipped
reason: Deferred to automated E2E-02 J1 (12/12 E2E green); user advanced to Phase 3

### 7. Graph Empty/Error States

expected: On a project with no cards, graph shows an empty state with a CTA (graph-empty-cta) to add stories. On fetch failure, an error state with a retry button (graph-retry) appears.
result: skipped
reason: Deferred to automated E2E-02 J1 (12/12 E2E green); user advanced to Phase 3

### 8. Comment on Card

expected: Opening a card in the drawer shows a comments section. Typing a comment and posting it adds it to the list immediately (no page refresh) with your name and relative time.
result: skipped
reason: Deferred to automated E2E-02 J2 (12/12 E2E green); user advanced to Phase 3

### 9. Threaded Reply

expected: Clicking Reply under a comment opens an inline composer. Submitting shows the reply nested under the parent with indentation.
result: skipped
reason: Deferred to automated E2E-02 J2 (12/12 E2E green); user advanced to Phase 3

### 10. @Mention

expected: Typing @ in the comment composer opens a mention picker listing org members. Selecting one inserts a mention. After posting, the mention renders as a chip (bg-primary/10).
result: skipped
reason: Deferred to automated E2E-02 J2 (12/12 E2E green); user advanced to Phase 3

### 11. SSE Live Update

expected: With a card drawer open, the LiveIndicator reaches "open". A comment posted from another session/account surfaces in the open drawer via a new-comments pill (jump to it), and the list updates without reload.
result: skipped
reason: Deferred to automated E2E-02 J2 (12/12 E2E green); user advanced to Phase 3

### 12. Live Indicator

expected: Board toolbar shows a live indicator with connecting/open/closed states. On connection loss it shows closed with a Retry button that reconnects.
result: skipped
reason: Deferred to automated E2E-02 J2 (12/12 E2E green); user advanced to Phase 3

### 13. Export Menu

expected: ExportMenu on the board toolbar offers CSV/JSON/Markdown downloads. Selecting one downloads a file with the correct content (epics/cards/relations). On an empty board the menu is disabled with a tooltip.
result: skipped
reason: Deferred to automated E2E-02 J3 (12/12 E2E green); user advanced to Phase 3

## Summary

total: 13
passed: 4
issues: 0
pending: 0
skipped: 9

## Gaps

[none yet]
