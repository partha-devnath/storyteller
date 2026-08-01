# 01-02 Plan Summary — @workspace/ai Package (LLM Engine)

Status: **Complete**

## Approval Gate (Task 1)

The blocking-human checkpoint for the `openai` npm dependency was approved by the human orchestrator before execution (publisher `openai-publisher` @openai.com, latest `7.3.0`, verified on npmjs). The `openai` SDK is the only new runtime dependency of `@workspace/ai`, pinned exact (`7.3.0`) per root `.npmrc save-exact`.

## Tasks Executed

### Task 2 — Package scaffold + providers

- `packages/ai/package.json`: `@workspace/ai`, subpath exports `.`, `./providers/*`, `./prompts/*`, `./operations/*`, `./schemas`, `./types`; deps `openai@7.3.0`, `zod@^4.4.3`, `@workspace/logger`
- `packages/ai/tsconfig.json` (extends root, lib ES2023, noEmit), `eslint.config.js` (mirrors other packages)
- `types.ts`: `LLMProvider` (chat/embed), `ChatMessage`, `BoardSnapshot`, `CardSnapshot`, `EpicSnapshot`, `RelationSnapshot`, `SemanticMatch`, `ProposalBatch`, `CreateChange`/`UpdateChange`/`CloseChange`, `EpicDraft`, `ClarifyingQuestion`, `GenerateBoardResult`
- `errors.ts`: `AiOutputError`
- `providers/openai.ts`: dynamic `await import("openai")`, chat → `chat.completions.create` (CHAT_MODEL default `gpt-4o-mini`), embed → `embeddings.create` (EMBEDDING_MODEL default `text-embedding-3-small`); throws clear error if `OPENAI_API_KEY` missing
- `providers/anthropic.ts`: stub, both methods throw "not implemented — Phase 1 ships the openai + mock providers"; zero SDK dependency
- `providers/mock.ts`: fully deterministic — 1536-dim normalized embeddings seeded from a stable FNV-style text hash; chat() routes on system-prompt markers (CRITICAL RULE → process JSON; "reviewing a requirements board" → review JSON; short/ambiguous user message → clarifying JSON; else board JSON). Stable slugs `loyalty-enroll` / `loyalty-points-accrual` / `loyalty-rewards-catalog` for E2E.
- `index.ts`: barrel + `aiProvider` singleton selected by `AI_PROVIDER` env (openai / anthropic / mock fallback), mirroring `email/index.ts`

### Task 3 — Strict output schemas + prompt builders

- `schemas.ts`: `generateBoardOutputSchema` (discriminatedUnion on `kind`), `processInstructionOutputSchema` (discriminatedUnion on `change_type` with create/update/close), `consistencyReviewOutputSchema`, `clarifyingAnswersInputSchema` — every object `.strict()` (AI-07); all with inferred types
- `prompts/generate-board.ts`, `prompts/clarifying-questions.ts`, `prompts/process-instruction.ts`, `prompts/consistency-review.ts`: pure functions returning `ChatMessage[]`; each system prompt carries the exact JSON output shape. `buildProcessInstructionPrompt` explicitly forbids updating CLOSED cards (AI-04 prompt-level guard) and compacts the board snapshot with open/closed flags + semantic matches.

### Task 4 — Operations + tests

- `operations/generate-board.ts`: `generateBoard` → `GenerateBoardResult` (board | clarifying), Zod-safeParsed, throws `AiOutputError` on malformed JSON
- `operations/clarify.ts`: `answerClarifyingQuestions` — threaded Q&A, includes board snapshot context
- `operations/process-instruction.ts`: `processInstruction` — defense-in-depth closed-card guard: update→create+evolution conversion for closed targets (evolution relation with `source_card_id`), drops updates targeting unknown cards with a warning; returns cleaned `ProposalBatch`. Never writes to DB (AI-08).
- `operations/consistency-review.ts`: `runConsistencyReview` → `{ flags }`
- Tests (4 files, 31 tests): `schemas.test.ts` (strictness + valid samples), `prompts.test.ts` (closed-card rule + snapshot compaction), `mock-provider.test.ts` (default provider, deterministic 1536-dim embeddings, schema-conformant canned output), `operations.test.ts` (stable slugs, clarifying kind, AiOutputError on malformed output, closed-card conversion, unknown-target drop)

## Verification Results

| Check                                   | Result                     |
| --------------------------------------- | -------------------------- |
| `bun --filter @workspace/ai typecheck`  | ✅ pass                    |
| `bun --filter @workspace/ai lint`       | ✅ pass                    |
| `bun --filter @workspace/ai test`       | ✅ 31 tests pass (4 files) |
| grep `export default` in src            | ✅ 0                       |
| grep `drizzle` / `@workspace/db` in src | ✅ 0                       |

## Notes / Deviations

- **Mock routing**: the mock `chat()` keys on system-prompt markers rather than user-message keywords (the operation-generated system prompts are the reliable discriminator; user-message keyword matching was ambiguous). Two mock-provider tests were adjusted to pass the matching system prompt.
- **`answerClarifyingQuestions` snapshot**: the clarify prompt builder accepts an optional `snapshot` and serializes it into the user message so the parameter is genuinely used (avoids an unused-var lint error and improves threaded context).
- **Zod v4**: `z.record` requires two args in zod 4 (`z.record(z.string(), z.string())`).
- **JSON.parse guard**: operations wrap `JSON.parse` in try/catch so malformed (non-JSON) provider output throws `AiOutputError` with a friendly message rather than a raw `SyntaxError`.

## Commit History (this plan)

- (task 2) feat(ai): scaffold package with LLMProvider interface and providers
- (task 3) feat(ai): add strict output schemas and prompt builders
- (task 4) feat(ai): add AI operations with closed-card guard
- (tests) test(ai): add provider and operations tests
