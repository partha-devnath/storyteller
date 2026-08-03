# Chat History + Inline Approve/Reject — Design Spec

> **Status:** Approved
> **Date:** 2026-08-04
> **Scope:** Project chat view (`/projects/:slug/chat`)

## Goal

Fix the project chat view and give it durable history:

1. **Left-align** the chat thread (currently the column is centered via `mx-auto max-w-3xl`).
2. **Persist chat history** to the database so it survives reloads and navigation.
3. **Keep AI responses in the reply** — board replies render their proposal inline, not just "Generated X story cards".
4. **Inline approve/reject actions** on AI board replies, reusing the existing proposal approve/reject endpoints.
5. **Persist clarifying-question exchanges** too (full replayable thread).

## Background / Current State

- `apps/web/src/routes/project-chat.tsx` holds the thread entirely in `useState` — lost on reload. Container uses `mx-auto flex max-w-3xl` (centered column). AI "board" replies render only a summary line ("Generated {n} story cards. Review them in the board's proposal queue").
- AI generation already persists proposals: `/api/ai/generate` and `/api/ai/clarify` call `persistProposal` (proposal table stores `instruction`, `prompt`, `aiResponse` JSON, `status` pending/approved/rejected) and return the created proposal.
- Approve/reject already exist: `POST /api/proposals/:id/approve`, `POST /api/proposals/:id/reject`, web hooks `useApproveProposal` / `useRejectProposal`. The board-page sidebar `ProposalReview` uses them.
- Org/project authorization middleware exists (`resolveOrgFromProject`, `requireRole`) used by proposals/ai routes.

## Design Decisions

- **Chat messages reference proposals rather than duplicating AI output.** A `board` chat message stores `proposalId`; the frontend fetches proposal detail (`useProposal`) to render changes + approve/reject. Single source of truth for AI output remains the `proposal` table.
- **Chat persistence is frontend-driven.** After a successful AI call, the web client POSTs the user prompt and the AI reply to `/api/chat`. Keeps chat storage decoupled from AI generation; no changes to the ai routes' contract.
- **Approve/reject reuse the existing proposal endpoints.** No new API surface for actions.
- **No streaming, no typing indicator, no editing/deleting messages, no pagination.** Threads are small; load all oldest-first.

## Data Model

New table `chat_message` in `packages/schemas/src/db/chat-message.ts`:

| Column       | Type                                                       | Notes                                |
| ------------ | ---------------------------------------------------------- | ------------------------------------ |
| `id`         | text PK (`generateId`)                                     |                                      |
| `projectId`  | text FK → project.id                                       | `onDelete: cascade`                  |
| `role`       | text enum `"user" \| "ai"`                                 |                                      |
| `kind`       | text enum `"prompt" \| "board" \| "clarifying" \| "error"` |                                      |
| `content`    | text                                                       | user prompt text / AI error text     |
| `questions`  | json (nullable)                                            | clarifying questions array           |
| `proposalId` | text FK → proposal.id (nullable)                           | board replies link to their proposal |
| `createdAt`  | timestamp default now                                      |                                      |
| `updatedAt`  | timestamp default now                                      |                                      |

Re-export from `packages/schemas/src/index.ts`. Zod validation in `packages/schemas/src/validations/chat.ts` (`chatMessageInputSchema`) for the POST body.

## API

New `apps/api/src/routes/chat.ts`, mounted at `/api/chat`, using `resolveOrgFromProject` + `requireRole("owner","admin","member")`:

- `GET /api/chat?project=<slug>` — list all messages for a project, oldest-first, org-scoped. Response: `{ success: true, data: ChatMessageRow[] }`.
- `POST /api/chat` — append one message. Body validated by `chatMessageInputSchema`. Returns created row, `201`.
- No approve/reject endpoints — reuse existing `/api/proposals/:id/approve` and `/reject`.

## Frontend

### Layout

- `apps/web/src/routes/project-chat.tsx`: remove `mx-auto` centering; keep a max-width column but left-aligned (e.g. `w-full max-w-3xl` or `max-w-3xl` without `mx-auto`). All bubbles left-aligned.

### History load

- New `apps/web/src/hooks/use-chat.ts`: `useChatMessages(projectSlug)` (fetch via `apiClient`) + `useAddChatMessage(projectSlug)` (POST, invalidate query).
- On mount, fetch `/api/chat?project=<slug>` and rehydrate the thread. Loading skeleton while pending; empty state text preserved.

### Thread rendering per kind

- `prompt` (user): left-aligned bubble with user text.
- `board` (ai): renders proposal inline — `useProposal(message.proposalId)`; instruction + change rows (create/update/close, conflict flags) styled like `ProposalReview`; **Approve / Reject buttons** via `useApproveProposal`/`useRejectProposal`; after action, invalidate proposals + show status badge (pending/approved/rejected). Keep a summary line.
- `clarifying` (ai): render questions + answer inputs (existing flow), restored from persisted `questions` json.
- `error` (ai): destructive-styled text.

### Composer

- Existing prompt textarea + Generate button, left-aligned. After a successful generate/clarify, POST the user prompt + AI reply to `/api/chat` and update the query cache.

### Scope guards

- Board-side `ProposalReview` sidebar stays as-is.
- `card-detail` route untouched.

## Files

**New:**

- `packages/schemas/src/db/chat-message.ts`
- `packages/schemas/src/validations/chat.ts`
- `apps/api/src/routes/chat.ts`
- `apps/web/src/hooks/use-chat.ts`
- chat-thread component (e.g. `apps/web/src/components/chat-thread.tsx`)

**Modified:**

- `packages/schemas/src/index.ts` (re-export chat-message + chat validation)
- `apps/api/src/index.ts` (mount chat route)
- `apps/web/src/routes/project-chat.tsx` (rewrite)
- e2e chat test (`apps/e2e/src/core-loop.test.ts` phase-2 J2 or adjacent)

## Testing

- **Unit (vitest):**
  - `chatMessageInputSchema` validation (valid/invalid bodies).
  - `use-chat` hook: fetch maps rows, add POSTs + invalidates (mock `apiClient`).
  - chat-thread component: renders each message kind; board reply shows changes + approve/reject and calls the mutation (mock hooks).
- **API:** chat route tests — auth/org scoping (401/403), list returns oldest-first, append persists + returns row. Follow existing route test patterns.
- **E2e (Playwright):** extend a chat journey — generate a board, approve it inline from the chat thread, reload the page, confirm the history (user prompt + AI board reply) is restored and status shows approved.

## Out of Scope

- Streaming / typing indicators
- Message editing / deletion
- Multi-project or cross-org chat
- Pagination / infinite scroll
- Changing the ai routes' response contract
- Board-side ProposalReview changes
