---
phase: 02-graph-collaboration-depth
plan: 04
subsystem: ui
tags: [comments, mentions, sse, react-query, shadcn, popover, textarea]

# Dependency graph
requires:
  - phase: 02-graph-collaboration-depth
    provides: 02-01 SSE event bus + GET /:id/comments API; 02-02 useProjectEvents/useExport/LiveIndicator/ExportMenu + shadcn primitives; 02-03 view switcher + graph tab
  - phase: 01-core-loop-mvp-differentiator
    provides: card drawer, use-cards hooks, use-orgs hooks, api-client
provides:
  - useCardComments hook with the canonical ["card", id, "comments"] query key (closes the Phase 1 comments-refresh invalidation bug)
  - Pure mention-segments parser (mention chips + inert @handle fallback, longest-first matching) with 5 unit tests
  - MentionPicker (shadcn Popover caret-anchored), CommentComposer (structured mentions, @ trigger, replies), CommentList (threaded, chips, relative time)
  - CardDrawer comments section rebuilt on the dedicated query + new-comments pill wired to SSE comment.created
  - ProjectBoard toolbar: LiveIndicator + ExportMenu with inline export-failure notice
affects:
  [
    02-05 export wiring,
    E2E-02 journeys J2 (comments/mentions/SSE) and J3 (export),
  ]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dedicated query keys per resource slice: comments live under [card, id, comments] so narrow invalidation refreshes exactly the list that consumes them"
    - "Structured mention state: plain textarea value + parallel userId Set; backspace pruning diffs the value against @Name markers"
    - "react-hooks/set-state-in-effect compliance: live-event counting defers setState into a setTimeout(0) callback inside the effect"
    - "Pure parser (parseMentionSegments) keeps XSS surface at zero: React text children + constructed spans only"

key-files:
  created:
    - apps/web/src/lib/mention-segments.ts
    - apps/web/src/lib/__tests__/mention-segments.test.ts
    - apps/web/src/components/mention-picker.tsx
    - apps/web/src/components/comment-composer.tsx
    - apps/web/src/components/comment-list.tsx
  modified:
    - apps/web/src/hooks/use-cards.ts
    - apps/web/src/hooks/use-orgs.ts
    - apps/web/src/hooks/use-projects.ts
    - apps/web/src/components/card-drawer.tsx
    - apps/web/src/routes/project-board.tsx
    - apps/web/src/components/__tests__/card-drawer.test.tsx

key-decisions:
  - "Drawer live-payload prop is named liveComment (value) rather than onLiveCommentCreated (callback): a callback the drawer never invokes cannot deliver the payload; the plan's own text endorses passing the latest payload down and letting the drawer count on cardId match"
  - "Live-comment counting defers setState into a setTimeout(0) callback inside the effect — the drawer receives prop-driven events, and react-hooks/set-state-in-effect forbids synchronous setState in effect bodies (repo constraint surfaced in 02-02); StrictMode-safe via a last-processed-comment-id ref + timeout cleanup"
  - "Pill count is per drawer instance (board unmounts the drawer between openings), so no reset-on-open effect is needed"
  - "Export failure renders a minimal destructive-tinted inline notice: no toast/sonner helper exists in the repo (plan sanctioned this fallback and asked to note it)"

patterns-established:
  - "Comments UI is fully component-extracted (composer/list/picker) with the drawer owning data wiring: useCardComments + useOrgMembers + SSE prop"
  - "Mention rendering contract: chips only for ids with a member mapping; unmatched tokens render as inert plain @handle (no link/action)"

requirements-completed: [DATA-04]

# Metrics
duration: 7min
completed: 2026-08-02
---

# Phase 02 Plan 04: Polished Comments + @Mentions + Live Board Toolbar Summary

**Comments rebuilt on the canonical `["card", id, "comments"]` query key (closing the Phase 1 refresh bug), with a caret-anchored mention picker, structured mentions sent as userIds, threaded replies, and an SSE-driven new-comments pill in the drawer — plus the live indicator and export menu wired into the board toolbar.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-02T14:07:22Z
- **Completed:** 2026-08-02T14:14:26Z
- **Tasks:** 3 (1 TDD)
- **Files modified:** 11 (5 created, 6 modified)

## Accomplishments

- **Must-fix closed (DATA-04 frontend):** `useCardComments` fetches `/api/cards/:id/comments` under query key `["card", cardId, "comments"]` — the exact key `useAddComment` already invalidated, so posting a comment now refreshes the list. The drawer reads comments from this query, not the card-detail payload (`detail.comments` grep = 0).
- **Pure mention parser:** `parseMentionSegments` splits bodies into text/mention/plain segments with longest-first name matching (e.g. `@Anna` never splits into `@Ann` + "a"); unknown/removed member ids fall back to inert `@handle` plain text — no links, no actions (anti-spoofing).
- **Three comment components:** `MentionPicker` (shadcn Popover anchored at caret coords, case-insensitive org-member filter, `mention-option-{userId}` testids), `CommentComposer` (auto-growing textarea, `@` trigger with caret measurement via a font-metric mirror, structured mentions Set with backspace pruning, replying header, Post pending/error states), `CommentList` (threaded replies indented `ml-6`, mention chips `bg-primary/10`, relative timestamps, Reply affordance).
- **Live pill + toolbar:** drawer shows `new-comments-pill` when an SSE `comment.created` event targets the open card, with Jump scroll + clear; board header shows `LiveIndicator` (connecting/open/closed + Retry); the board-tab toolbar hosts `ExportMenu` with an inline destructive export-failure notice.
- **All verifications green:** web typecheck, build, lint; full vitest suite 46 files / 225 tests pass (5 new mention-segments tests + updated card-drawer mock); all grep gates 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: useCardComments (must-fix) + mention segment parser (TDD)** — `0e0a460` (test: RED) → `8c3fbcb` (feat: GREEN)
2. **Task 2: mention-picker, comment-composer, comment-list** — `d5f4bb4` (feat)
3. **Task 3: Drawer integration + board toolbar wiring** — `1fba2c2` (feat)

## Files Created/Modified

- `apps/web/src/lib/mention-segments.ts` - Pure `parseMentionSegments` + `MentionSegment` type (text/mention/plain, longest-first)
- `apps/web/src/lib/__tests__/mention-segments.test.ts` - 5 tests: basic split, unknown id → plain, longest-first collision, no-mentions, trailing @
- `apps/web/src/components/mention-picker.tsx` - Caret-anchored Popover member list (`mention-picker`, `mention-option-{id}`)
- `apps/web/src/components/comment-composer.tsx` - `@` trigger composer with structured mentions, reply header, submit states
- `apps/web/src/components/comment-list.tsx` - Threaded list with chips, relative time, Reply; empty state "No comments yet — start the discussion."
- `apps/web/src/hooks/use-cards.ts` - `useCardComments` + `CommentItem` type; `useAddComment` input now carries `mentions[]`
- `apps/web/src/hooks/use-orgs.ts` - `useOrgMembers` gains `enabled` option
- `apps/web/src/hooks/use-projects.ts` - `ProjectDetail.project` gains `orgId`
- `apps/web/src/components/card-drawer.tsx` - Comments section rebuilt (pill header, CommentList, CommentComposer), new props `orgId`/`liveComment`
- `apps/web/src/routes/project-board.tsx` - `useProjectEvents` → liveComment state, LiveIndicator, ExportMenu + export-error notice
- `apps/web/src/components/__tests__/card-drawer.test.tsx` - Mock adds `useCardComments`, `useOrgMembers`, keeps `useAddComment`

## Decisions Made

1. **Drawer live-payload prop named `liveComment` (value), not `onLiveCommentCreated` (callback).** A callback prop the drawer never invokes cannot carry event data; the plan's own text says "pass the latest payload down and let the drawer count when cardId matches". The board's `useProjectEvents` handler feeds it.
2. **setState deferred out of the effect body** for pill counting (setTimeout(0) + cleanup) — required by `react-hooks/set-state-in-effect` (repo constraint documented in 02-02); a `lastLiveCommentId` ref + timeout cleanup keeps StrictMode double-invoke from double-counting.
3. **No reset-on-open effect needed** — the board unmounts the drawer between card openings, so `newCommentCount` starts at 0 per instance.
4. **Export failure fallback:** repo has no toast helper; used a minimal `text-xs text-destructive` inline notice (plan-sanctioned, to be noted in summary).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `useOrgMembers` had no way to skip the query on an empty orgId**

- **Found during:** Task 2/3 (composer + drawer both need org members, but orgId can be empty before the project detail loads)
- **Issue:** The plan requires "guard orgId empty (skip the query when falsy)", but `useOrgMembers(orgId)` unconditionally queries `/api/orgs/{id}/members` — with an empty id it would hit a malformed URL
- **Fix:** Added an optional `{ enabled?: boolean }` options param, defaulting to `Boolean(orgId)` (backward compatible; existing callers unchanged)
- **Files modified:** apps/web/src/hooks/use-orgs.ts (outside the plan's files_modified list)
- **Verification:** typecheck/lint pass; composer + drawer pass `enabled: Boolean(orgId)`
- **Committed in:** d5f4bb4 (Task 2 commit)

**2. [Rule 2 - Missing Critical] `ProjectDetail.project` type omitted `orgId`**

- **Found during:** Task 3 (drawer prop `orgId={projectDetail?.project.orgId}`)
- **Issue:** The API returns the full project row (which includes `orgId`), but the frontend `ProjectDetail` type didn't declare it, so the plan's required prop wiring would not typecheck
- **Fix:** Added `orgId: string` to the `ProjectDetail.project` shape in use-projects.ts
- **Files modified:** apps/web/src/hooks/use-projects.ts (outside the plan's files_modified list)
- **Verification:** `bun --filter web typecheck` passes
- **Committed in:** 1fba2c2 (Task 3 commit)

**3. [Rule 1 - Bug] Drawer test mock lacked `useCardComments` and the composer's `useAddComment`**

- **Found during:** Task 3 (card-drawer tests)
- **Issue:** The rebuilt drawer imports `useCardComments`/`useOrgMembers` and renders `CommentComposer` (which calls `useAddComment`); the old mock provided neither, which would crash the render (undefined hook calls / "No QueryClient set")
- **Fix:** Added `useCardComments: () => ({ data: [] })`, a `use-orgs` mock, and kept `useAddComment` in the mock
- **Files modified:** apps/web/src/components/**tests**/card-drawer.test.tsx
- **Verification:** card-drawer suite 3/3 passes; full suite 225 pass
- **Committed in:** 1fba2c2 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 test-mock bug)
**Impact on plan:** All fixes required to satisfy the plan's own acceptance criteria (orgId guard, typecheck, test mock). No scope creep — the `enabled` option and `orgId` type field are additive and backward compatible.

## TDD Gate Compliance

- **Task 1 (tdd="true"):** RED `0e0a460` (test — failed with module-not-found before implementation) → GREEN `8c3fbcb` (feat — 5/5 tests pass, typecheck green). Clean two-commit RED/GREEN gate. No REFACTOR commit needed (implementation minimal and clean).

## Issues Encountered

- **react-hooks/set-state-in-effect:** the drawer's prop-driven pill counting initially called setState synchronously in the effect body; the rule (active in this repo's `flat.recommended`, v7.1.1) rejects it. Resolved by deferring the update into a setTimeout(0) callback with cleanup — the setState then runs in a callback, which the rule permits (same pattern family as useProjectEvents' EventSource callbacks).
- **Test invocation:** `bun --filter web test` bypasses the root vitest config (jsdom) — documented in 02-02; component/parser tests run from the repo root (`bun run test -- <paths>`). Full suite: 46 files / 225 tests green.

## Known Stubs

None — comments render from the live `useCardComments` query, the pill is wired to real SSE payloads, and the toolbar components are fully functional.

## Threat Flags

None — all security-relevant surface (comment body rendering, SSE payloads, org member names) was already declared in the plan's threat model (T-02-31..35). Repo-wide grep gates hold: `dangerouslySetInnerHTML` = 0, `rehype-raw` = 0 across apps/web; `font-medium` = 0 in the three new components; the anti-spoofing rule (chips only for mapped ids) is enforced in `parseMentionSegments`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Comments/mentions/SSE surface complete (E2E J2):** `comment-input`, `comment-post`, `comment-item`, `comment-mention`, `mention-picker`, `mention-option-{userId}`, `live-indicator`, `new-comments-pill` anchors all in the DOM contract
- **Export surface ready (E2E J3):** `export-menu` / `export-csv` / `export-json` / `export-markdown` mounted on the board tab with the empty-board disabled+tooltip state
- **Ready for 02-05:** remaining export wiring/verification and any graph-tab polish
- The `liveComment` prop channel (board → drawer) is the pattern future live features (card.created/updated) can reuse

## Self-Check: PASSED

- All 5 created files exist on disk (mention-segments.ts + test, picker, composer, list)
- All 4 commits verified in git history: `0e0a460` (RED), `8c3fbcb` (GREEN), `d5f4bb4`, `1fba2c2`
- `bun --filter web typecheck` — exit 0
- `bun --filter web lint` — exit 0
- `bun --filter web build` — exit 0
- `bun run test` — 46 files / 225 tests pass (5 new)
- grep `detail.comments` in card-drawer.tsx — 0 (must-fix verified)
- grep `"comments"` in use-cards.ts — both useCardComments key and useAddComment invalidation key present, same literal
- grep gates: `dangerouslySetInnerHTML` apps/web = 0; `rehype-raw` apps/web = 0; `font-medium` in new components = 0
- No untracked files, no unexpected deletions

---

_Phase: 02-graph-collaboration-depth_
_Completed: 2026-08-02_
