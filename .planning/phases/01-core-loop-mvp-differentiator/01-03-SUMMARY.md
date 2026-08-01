# 01-03 Plan Summary — @workspace/vector Package (Semantic Memory)

Status: **Complete**

## Tasks Executed

### Task 1 — Package + helpers

- `packages/vector/package.json`: `@workspace/vector`, exports `.`; deps `@workspace/db`, `@workspace/schemas`, `@workspace/ai`, `@workspace/logger`, `drizzle-orm`
- `packages/vector/tsconfig.json` + `eslint.config.js` (mirrors other packages)
- `src/index.ts`:
  - `embedCard({ cardId, provider })` — loads the card, builds composite text (`title + description + acceptanceCriteria + priority + custom-field values`), calls `provider.embed`, deletes existing `card_embedding` rows for the card, then inserts one row. No-op + warning log on missing card or wrong dimension (search stays resilient).
  - `reindexCard({ cardId, provider, versionId })` — same as embedCard but stores `versionId` on the new embedding row (approval-time recompute; closed-card embeddings persist because reindex replaces the row only).
  - `semanticSearch({ projectId, query, provider, limit=6 })` — embeds the query, joins `card_embedding → card` filtered by `card.projectId`, orders by `1 - cosineDistance(embedding, queryVector)` descending, maps to `SemanticMatch[]` (`cardId, title, slug, isClosed, similarity`).
  - Uses drizzle query builder only (`and`, `eq`, `desc`, `sql`, `cosineDistance`); `LLMProvider`/`SemanticMatch` types imported from `@workspace/ai/types`.

### Task 2 — Unit tests

- `src/__tests__/vector.test.ts` (6 tests, mocked `db` + `logger` + provider via `vi.hoisted`):
  1. embedCard calls `provider.embed` once and inserts a 1536-length vector
  2. embedCard deletes existing rows before inserting
  3. embedCard on missing card does not throw (warns, no insert)
  4. reindexCard passes `versionId` into the inserted row
  5. semanticSearch embeds the query, scopes by projectId, orders by cosineDistance, returns `isClosed` + `similarity`
  6. semanticSearch returns `[]` when no rows match

## Verification Results

| Check                                      | Result             |
| ------------------------------------------ | ------------------ |
| `bun --filter @workspace/vector typecheck` | ✅ pass            |
| `bun --filter @workspace/vector lint`      | ✅ pass            |
| `bun --filter @workspace/vector test`      | ✅ 6 tests pass    |
| grep raw `INSERT/UPDATE/DELETE` sql in src | ✅ 0               |
| grep `@workspace/vector` in apps/web       | ✅ 0 (server-only) |

## Notes / Deviations

- Imported `SemanticMatch` from `@workspace/ai/types` subpath export (the package barrel `@workspace/ai` re-exports operations/providers/schemas but types live on `./types`).
- Test mock object-literal providers use full property syntax (`chat: async () => ""`) to avoid esbuild parser errors mixing method shorthand with named properties in the same object.

## Commit History (this plan)

- feat(vector): add pgvector semantic memory helpers and tests
