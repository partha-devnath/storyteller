# Design: Proposed card opens sidebar instead of navigating

Date: 2026-08-09
Status: Approved

## Problem

Clicking a proposed card in the board's Proposed lane navigates to the
proposals page (`/projects/{slug}/proposals?proposal={id}`). Users expect the
same sidebar experience as normal cards — a drawer they can inspect and act
on without leaving the board.

## Current behavior

- `kanban.tsx` proposed card click → `onOpenProposal(proposalId)`
- `project-board.tsx:139-143` → `navigate("/projects/{slug}/proposals?proposal={proposalId}")`

## Change

### 1. New `ProposalDrawer` component (`apps/web/src/components/proposal-drawer.tsx`)

Mirrors `CardDrawer` shell (fixed overlay, right sidebar, max-w-xl, close on
overlay click / ✕ button).

Props:

```ts
{
  proposalId: string
  open: boolean
  onClose: () => void
  projectSlug: string
}
```

Data: `useProposal(proposalId, projectSlug)`. The Proposed lane only shows
create changes, so the drawer renders the first `changeType === "create"`
change from `changes[]`.

Content:

- Header: "proposed" badge + title from `newData.title`
- Priority / status chips from `newData.priority`, `newData.status`
- Description — `newData.description` as markdown (ReactMarkdown)
- Acceptance criteria — `newData.acceptanceCriteria` as checklist
- Conflict flags — warning block (`⚠ {summary}`), same style as
  `proposal-review.tsx`
- Relation summary — list of `type` + `note`
- Actions: Approve (`useApproveProposal`), Reject with optional reason
  (`useRejectProposal`), "Open in chat" link →
  `/projects/{projectSlug}/proposals?proposal={proposalId}`
- On approve/reject success: close drawer. Board refresh is handled by the
  invalidations below (no `window.location.reload()`).

Loading state: nothing renders until data arrives (matches CardDrawer
pattern — `if (!open || !detail) return null`).

### 2. `project-board.tsx`

- Add state `activeProposalId: string | null`
- `onOpenProposal={(proposalId) => setActiveProposalId(proposalId)}` (replaces
  `navigate` at lines 139-143; `useNavigate` import removed if unused)
- Render `<ProposalDrawer>` alongside `<CardDrawer>`

### 3. `apps/web/src/hooks/use-proposals.ts`

Extend `onSuccess` of `useApproveProposal` and `useRejectProposal` to also
invalidate `["project", projectSlug, "proposed"]` — the proposed lane data.
Existing invalidations (`["proposal"]`, `["proposals"]`) stay. Board card
refresh after approval is already covered by SSE `card.created` →
`["project", slug, "cards"]`.

## Not changing

- Graph view proposed nodes (separate click path)
- Proposals page itself
- Approve/reject API logic
- `onOpenProposal` prop signature in `kanban.tsx` (still used by the new
  handler)

## Testing

- Component test `proposal-drawer.test.tsx` (pattern: `chat-thread.test.tsx`):
  - Renders title, description, criteria from a create change
  - Renders conflict flags when present
  - Approve button calls approve mutation
- Manual: click proposed card → drawer opens, no navigation; approve → drawer
  closes, card appears on board, lane entry disappears.
