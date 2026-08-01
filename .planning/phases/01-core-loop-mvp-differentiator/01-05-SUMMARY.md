# 01-05 Plan Summary — AI/Proposal/Card Routes + Apply-Proposal Service

Status: **Complete**

## Tasks Executed

### Task 1 — Services

- `services/board-snapshot.ts`:
  - `buildBoardSnapshot(projectId)` — reads project + epics + all cards (open AND closed — VEC-02 needs closed cards in context) + relations; maps to `BoardSnapshot` (columns from project.columns, per-card epicName, isClosed)
  - `buildSemanticContext({ projectId, instruction, provider })` — calls `semanticSearch` from `@workspace/vector` with the instruction text, limit 6 (VEC-02)
- `services/apply-proposal.ts` — `applyProposal({ proposalId, approverId })` inside `db.transaction`:
  - Loads proposal → 404 if missing, 409 "Proposal already resolved" if non-pending (T-05-04: status check + writes in one tx, no TOCTOU)
  - For create: inserts card (unique slug with `-N` suffix on collision), card_version (v1, changeType "create", sourceProposalChangeId), relations, attachments; resolves/creates epic by name
  - For update: 404/409 if missing/closed (T-05-02 closed-card immutability backstop), applies fields (never is_closed/closed_by/closed_at), bumps versionNo (max+1), inserts version + relations
  - For close: idempotent if already closed, else sets isClosed/closedBy/closedAt + close version
  - Updates proposal { status: "approved", approvedBy, approvedAt } (APPR-01/02/03)
  - After each version insert, calls `reindexCard` (VEC-03) wrapped in try/catch — embedding failures never roll back the approval
  - All writes via Drizzle query builder (no raw SQL)

### Task 2 — AI routes

- `routes/ai.ts` (`aiRoutes`, onError + `resolveOrgFromProject` + `requireRole("owner","admin","member")`):
  - POST /generate → snapshot + `generateBoard` → clarifying (returns questions, persists nothing) OR builds proposal_changes for every story (create), inserts pending proposal with instruction+prompt+aiResponse (auditable)
  - POST /process → semantic context + snapshot + `processInstruction` → inserts proposal + changes from batch (create/update/close with newData + relationSummary + conflictFlags — APPR-04)
  - POST /clarify → `answerClarifyingQuestions` → clarifying OR persists board proposal
  - Raw AI response + built prompt stored on the proposal row for auditability
  - `app.ts`: `app.use("/api/ai/*", rateLimiter(10, 60_000))` before mounting (T-05-06 DoS mitigation)

### Task 3 — Proposal + card routes + tests

- `routes/proposals.ts` (`resolveOrgFromProject`; viewer read-only via requireRole on writes):
  - GET /?project= → queue (pending first, then approved/rejected) with changeCount
  - GET /:id → proposal + changes (newData, relationSummary, conflictFlags — APPR-04 diff source)
  - POST /:id/approve → requireRole(owner/admin/member) → `applyProposal` (200 { applied }, 409 if resolved)
  - POST /:id/reject → requireRole(...) → rejectProposalSchema, 409 if non-pending, records approverId/rejectedAt/reason
- `routes/cards.ts` (`resolveOrgFromProject`; member+ writes, viewer read-only):
  - POST / → manual create: card + v1 version + attachments (live immediately, APPR-03) → 201
  - PATCH /:id → strict updateCardSchema; 409 "Closed cards are immutable" if closed (DATA-02 manual versioning)
  - POST /:id/close → idempotent close + close version
  - GET /:id → card + latest version + relations + comments (with user names) + attachments
  - GET /:id/versions → version history desc
  - GET /:id/similar → `semanticSearch` (projectScoped, excludes self, limit 6) — VEC-04
  - POST/GET /:id/comments → comment create/list with user names + threading (parentId) — DATA-04
- `app.ts`: registered `/api/proposals` + `/api/cards`
- Tests: `approval-flow.test.ts` (5 route-validation cases), `cards.test.ts` (4 route-validation cases) — DB-backed approval flows covered by E2E (plan 01-08); unit tests assert auth/validation gating without sessions
- `@workspace/ai` barrel now re-exports the 4 operations (generateBoard, answerClarifyingQuestions, processInstruction, runConsistencyReview)

## Verification Results

| Check                                          | Result                                                   |
| ---------------------------------------------- | -------------------------------------------------------- |
| `bun --filter @workspace/ai typecheck && test` | ✅ pass (31 tests)                                       |
| `bun --filter @workspace/vector typecheck`     | ✅ pass                                                  |
| `bun --filter api typecheck && lint`           | ✅ pass                                                  |
| `bun --filter api test` (bun:test)             | ✅ 15 tests pass (2 app + 4 orgs + 5 approval + 4 cards) |
| grep `export default` in new routes/services   | ✅ 0                                                     |

## Notes / Deviations

- **Rate limiter resilience**: the template's `rateLimiter` called `getConnInfo(c)` unguarded, which throws a `TypeError` in `app.fetch` test context (no real Bun server) → all `/api/ai/*` routes returned 500 in tests. Wrapped in try/catch (fallback `127.0.0.1`) matching the existing request-id middleware pattern.
- **Sub-app error isolation** (from plan 01-04): every route sub-app registers `onError(errorHandler)` so thrown `.status` errors normalize to the `{ success, error }` envelope.
- **Diff computation**: proposal detail returns change rows with an (empty) diff scaffold; full field-level diff is computed client-side from the change's newData vs. current card — kept server payload lean.
- Added `@workspace/ai` + `@workspace/vector` to `apps/api` dependencies.

## Commit History (this plan)

- feat(api): add board snapshot, apply-proposal service, AI/proposal/card routes
