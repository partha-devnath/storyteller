# 01-07 Plan Summary — Kanban + Drag-and-Drop + Proposal Review + Card Drawer

Status: **Complete**

## Approval Gate (Task 1)

All three frontend dependencies verified legitimate and approved by the human orchestrator before install:

- `@dnd-kit/react`, `@dnd-kit/dom`, `@dnd-kit/abstract` (0.5.0 — same minor per dnd-kit requirement; React 19-native suite)
- `react-markdown` 10.1.0 (wooorm)
- `diff` 9.0.0 (jsdiff, kpdecker)

## Tasks Executed

### Task 2 — Deps + use-cards hooks + board

- Installed all 5 deps pinned exact in `apps/web/package.json`
- `hooks/use-cards.ts`: `useCards(projectSlug)`, `useCardDetail`, `useCardVersions`, `useCardSimilar`, `useCreateCard`, `useMoveCard` (PATCH status), `useCloseCard`, `useAddComment` — keys `["project", slug]`, `["card", id]`, `["card", id, "versions"|"similar"|"comments"]`
- `components/kanban.tsx`: `KanbanBoard` with `DragDropProvider` + `onDragEnd` (source cardId/status vs target columnKey → `onMove`)
- `components/board-column.tsx`: droppable column (`useDroppable`), draggable cards (`useDraggable`, data carries cardId+status), empty state
- `components/closed-rail.tsx`: read-only dashed rail of closed cards, collapse toggle via board store
- `routes/project-board.tsx`: `ProjectBoardPage` — board columns from project config (fallback to 5 standards), Closed rail, ProposalReview side panel, CardDrawer
- Closed cards never draggable (filtered out of columns, rendered only in Closed rail; API 409s closed updates — double protection)

### Task 3 — Review queue + diff + drawer + deep link + tests

- `components/proposal-review.tsx`: pending proposal queue (`data-testid="proposal-item"`), expand → per-change preview (changeType chip, new title, conflict flags), Approve (`data-testid="approve-proposal"`) + Reject with optional reason
- `components/diff-panel.tsx`: `DiffPanel({before, after})` — `diffLines(before, after)` line-by-line with +/- highlighting, `data-testid="diff-panel"`, empty-state guard
- `components/card-drawer.tsx`: `CardDrawer` fixed-overlay panel with 4 tabs:
  - Details: react-markdown body, acceptance criteria checklist, custom fields pills, attachments, comments (RHF-style form)
  - History (`data-testid="history-tab"`): version list + DiffPanel of latest vs previous
  - Relations: type chips (dependency/hierarchy/evolution)
  - Similar (`data-testid="similar-list"`): similarity %
  - Header: title/status/priority + Copy link (`data-testid="copy-link"` → `/project/:slug/card/:cardSlug`) + close; closed-card lock banner
- `routes/card-detail.tsx`: deep-link page `/project/:slug/card/:cardSlug` — resolves card by slug via project cards, renders drawer open
- `App.tsx`: registered `/projects/:slug` → ProjectBoardPage and `/project/:slug/card/:cardSlug` → CardDetailPage
- Tests (3 files, 7 tests): `board-card.test.tsx` (title/priority/criteria + closed lock), `diff-panel.test.tsx` (added lines + empty state), `card-drawer.test.tsx` (details/history/copy-link with mocked hooks + clipboard)

## Verification Results

| Check                                      | Result                                     |
| ------------------------------------------ | ------------------------------------------ |
| `bun --filter web typecheck`               | ✅ pass                                    |
| `bun --filter web lint`                    | ✅ pass                                    |
| `bun --filter web build`                   | ✅ pass (vite build succeeds)              |
| `bun run test` (full, root)                | ✅ 198 tests / 38 files pass (incl. 7 new) |
| grep `dangerouslySetInnerHTML` in apps/web | ✅ 0                                       |
| grep `rehype-raw` in apps/web              | ✅ 0                                       |

## Notes / Deviations

- **Fixed a pre-existing template build bug**: `bun --filter web build` (tsc -b) failed on ALL `__tests__` files because `tsconfig.app.json` had `types: ["vite/client"]` only — `toBeInTheDocument` / vitest globals weren't type-known. Added `"vitest/globals"` and `"@testing-library/jest-dom"` to the `types` array. This unblocks the plan's build verification and does NOT break vitest (root config still drives test runtime). An earlier attempt to exclude `__tests__` from the tsconfig broke vitest (JSX transform derives from the same include), so augmenting types is the correct fix.
- **`diff` v9 API**: `diffLines(before, after)` used directly (NOT `createTwoFilesPatch` + `diffLines(patch)` — diffing a unified-patch string throws in v9's tokenizer).
- dnd-kit 0.5 uses the React 19 `DragDropProvider`/`useDraggable`/`useDroppable` API (new suite); drag data carried via `data: { cardId, status }` / `{ columnKey }` and read from `event.operation.source/target.data`.

## Commit History (this plan)

- feat(web): add kanban board, dnd, proposal review, card drawer, deep links
