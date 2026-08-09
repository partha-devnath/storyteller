# Design: Proposed lane with create + update types and per-card actions

Date: 2026-08-09
Status: Approved

## Problem

The board's Proposed lane only shows `create` proposal changes. Update
proposals (changing an existing card) never appear on the board — they are
only visible in the chat thread, and approval is all-or-nothing for the whole
proposal. Users want: both proposed-card types visible on the board, an
update card showing what will change (diff), and per-card approve/reject.

## Scope

- Proposed lane shows create AND update changes
- Drawer shows card details for creates; before/after diff for updates
- Per-card approve/reject; proposal stays pending until all changes resolved
- Close-type changes stay out of the lane (still resolvable via whole-proposal
  actions in chat)

## Backend

### `apps/api/src/services/apply-proposal.ts`

Extract the per-change apply logic into `applyChange(tx, projectId, change,
approverId, reindexJobs)` so both whole-proposal and single-change approval
share it. `applyProposal` keeps its behavior (loops all changes, marks
proposal approved).

### `POST /api/proposals/:id/approve` and `POST /api/proposals/:id/reject`

Body: `{ changeId?: string, reason?: string }` (reject only).

With `changeId` (single-change mode):

- Verify the change belongs to the proposal and is not already resolved
  (approvedAt/rejectedAt null) — else 409
- Approve: apply ONLY that change, then set
  `proposalChange.approvedAt`/`approverId`
- Reject: set `proposalChange.rejectedAt`/`rejectionReason`/`approverId` —
  no card apply
- Proposal status stays `pending` while any change remains unresolved
  (approvedAt/rejectedAt null); when the last change resolves, proposal
  becomes `approved` (or `rejected` when all were rejected)
- Return `{ applied: 0|1, proposalStatus }`

Without `changeId`: existing whole-proposal behavior unchanged.

New zod schema `resolveProposalChangeSchema` in
`packages/schemas/src/validations/proposal.ts`:
`{ changeId?: string, reason?: string, max 500 }`.

### `GET /api/projects/:slug/proposed` (lane)

Include update changes. Response rows:

- create: unchanged shape (`changeType: "create"`, title from newData)
- update: `changeType: "update"`, `targetCardId`, title = new title if
  present else target card's current title, `status`/`priority` from
  newData if present else target card's current values,
  `acceptanceCriteriaCount` = new criteria length if present else target's
- exclude changes with `approvedAt` or `rejectedAt` set (already resolved)

`ProposedCard` web type gains `changeType`, `changeId`, `targetCardId`.

## Frontend

### Hooks — `apps/web/src/hooks/use-proposals.ts`

- `useApproveProposal(projectSlug)`: mutationFn accepts
  `{ proposalId: string, changeId?: string }`
- `useRejectProposal(projectSlug)`: mutationFn accepts
  `{ proposalId: string, changeId?: string, reason?: string }`
- Both keep existing invalidations (`["proposal"]`, `["proposals"]`,
  `["project", slug, "proposed"]`)

### Lane — `apps/web/src/components/kanban.tsx`

Update rows get an `update` badge (warn-styled, like `proposed` but distinct
copy); create rows keep `proposed`. Both clickable → `onOpenProposal`
(unchanged signature).

### Drawer — `apps/web/src/components/proposal-drawer.tsx`

- Render the change identified by `changeId` (prop added), falling back to
  the first pending change
- Create change: existing content preview
- Update change: diff view
  - title: before → after
  - description: `DiffPanel` (existing component, before/after strings)
  - acceptanceCriteria: before list vs after list (added/removed marked)
  - status/priority: before → after chips
  - conflict flags + relation summary (existing rendering)
- Footer actions (per-card):
  - Approve → `approve.mutate({ proposalId, changeId })`
  - Reject → reason input → `reject.mutate({ proposalId, changeId, reason })`
  - On success: close drawer; lane + proposal invalidations refresh board
- `before` data comes from `GET /api/proposals/:id` (already attached)

### Props

`ProposalDrawer` gains `changeId?: string`. `ProjectBoardPage` passes the
lane row's `changeId` alongside `proposalId`.

## Not changing

- Whole-proposal approve/reject in chat thread (`chat-thread.tsx`)
- Close-type changes in the lane
- Proposal resolution flow (`applyProposal` for whole proposal)
- Graph view, proposals page

## Testing

- API (bun:test): approve/reject with unknown changeId → 404/409;
  single-change approve marks only that change; proposal stays pending with
  remaining changes; last change flips proposal status. Unauthenticated →
  401 (existing pattern)
- Schemas (vitest): `resolveProposalChangeSchema` rules
- Web (vitest): drawer renders update diff (before/after fields), per-card
  approve calls mutation with `{ proposalId, changeId }`; lane renders
  update badge
- Manual: generate proposal with mixed create+update → both appear in lane;
  approve one card → applies, lane keeps rest; approve all → proposal
  approved
