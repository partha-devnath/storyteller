# Design: Smart chat generation — dedupe, update-vs-create, section completeness

Date: 2026-08-09
Status: Approved

## Problem

The chat AI generates boards blindly: every story becomes a create card, so
asking for something that already exists produces duplicates, and requests
to change an existing card produce a parallel card instead of an update.
Generated cards also miss configured card sections inconsistently.

## Approach

AI decides create / update / skip from semantic matches, in every chat flow.
Card sections are always completed for new chat-created cards. Chat replies
summarize what happened. Update cards carry relation hints.

## 1. Semantic context for all flows

`buildSemanticContext` (already used by `/process`) also runs for
`/generate` and `/clarify`:

- embed the user prompt + prior answers
- top-k (e.g. 5) most similar open cards by similarity score
- pass into the prompt as "Existing cards that may match:" entries:
  `cardId, title, status, similarity, first 200 chars of description`

The generated prompt text (all three flows) instructs the AI:

- **create** when no existing card matches
- **update** when a matching card exists and the request changes it —
  emit `target_card_id` and only the changed fields
- **skip** when a matching card already covers the request —
  emit `conflict_flags: [{ type: "duplicate", summary }]` and NO card content

## 2. AI output schema — `generateBoardOutputSchema`

Each story gains optional fields:

```ts
action: z.enum(["create", "update", "skip"]).optional(), // default "create"
targetCardId: z.string().optional(),
conflictFlags: z
  .array(z.object({ type: z.enum(["contradiction", "duplicate", "conflict"]), summary: z.string() }))
  .optional(),
```

`processChangeSchema` is unchanged (already supports create/update/close +
conflictFlags). `EpicDraft.stories` type gains the same fields.

## 3. Flow mapping (`/generate`, `/clarify`)

`ai.ts` maps each story to a proposal change:

- `create` → create change (current shape; includes `sections`)
- `update` → update change `{ targetCardId, fields: { title?, description?,
acceptanceCriteria?, status?, priority?, sections? }, relationSummary, conflictFlags }`
  - target must exist in the board snapshot → else the change is dropped
    (mirrors the process-flow rule)
- `skip` → NO change; the skip reason joins the reply summary text

`/process` is unchanged (already emits update/close + flags).

## 4. Section completeness for new cards

When a story creates a card in any chat flow:

- the route reads the project's `cardSections` (the active config)
- for every configured section key, if the AI did not provide a value, the
  change's `sections` gets `key: ""` — so the card always carries every
  configured section and renders consistently
- empty sections render as empty blocks (no crash — existing render code)

## 5. Smart reply summary

The chat message content changes from "Generated N story cards." to:

```
Generated 8 cards: 6 new, 1 update, 1 skipped.
Skipped: "Loyalty enrollment" already exists.
```

Computed from the mapped changes + skipped stories. Applied in `/generate`
and `/clarify` responses and the persisted chat message (web builds the
message from `result.proposal.changeCount` + skipped info returned by the
API).

API returns `{ kind: "board", proposal, summary: { created, updated, skipped: [{title, reason}] } }`.

## 6. Relation hints on updates

The AI may attach `relationSummary` entries (existing types: dependency,
hierarchy, evolution) to update stories — e.g. `evolution` when an update
replaces a closed card. These flow into the change's relationSummary
(existing insert logic) and render in the drawer.

## 7. Embedding reuse

One embed per chat turn: `buildSemanticContext` output is computed once in
the route and passed to the generation operation (instead of re-embedding in
each step). The three routes share the helper (already the case for
`/process`; extend to the other two).

## Files

- `packages/ai/src/schemas.ts` — story schema fields
- `packages/ai/src/types.ts` — `EpicDraft.stories` + `GenerateBoardResult`
- `packages/ai/src/prompts/generate-board.ts` + `clarifying-questions.ts` —
  semantic matches + action instructions
- `packages/ai/src/operations/generate-board.ts` + `clarify.ts` — pass
  semantic matches through
- `apps/api/src/routes/ai.ts` — semantic context for all flows; story→change
  mapping with create/update/skip; section completion; reply summary
- `apps/web/src/hooks/use-ai.ts` — summary types
- `apps/web/src/routes/proposals.tsx` — reply message from summary
- `packages/ai/src/__tests__/` — schema + operation tests
- `apps/api/src/__tests__/` — mapping tests (service-level, mocked provider)

## Not changing

- Proposal storage/apply pipeline (create/update changes already handled)
- Drawer diff + per-card approve (already works for updates)
- Card sections settings UI
- Semantic search implementation

## Testing

- Schema: story with action/targetCardId/conflictFlags accepted; invalid
  combos rejected (update without targetCardId)
- Operations: mocked provider returning mixed actions → result carries
  action/skip info
- API mapping: story update with unknown target dropped; skip produces no
  change but lands in summary; section completion fills missing keys
- Web: reply message renders the summary line
- Manual: chat "add referral feature" twice → second returns update/skip;
  card has all sections
