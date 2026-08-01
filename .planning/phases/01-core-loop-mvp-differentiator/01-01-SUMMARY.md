# 01-01 Plan Summary — Data Model + Validations + Pgvector

Status: **Complete**

## Tasks Executed

### Task 1 — 13 Drizzle tables (committed `a854585`)

Created table modules in `packages/schemas/src/db/` following the `files.ts` shape:

- `organization.ts`, `organization-member.ts`, `project.ts`, `epic.ts`, `card.ts`, `card-version.ts`, `card-relation.ts`, `card-attachment.ts`, `custom-field.ts`, `proposal.ts`, `proposal-change.ts`, `comment.ts`, `card-embedding.ts`
- All named exports; camelCase props → snake_case columns; cascade FKs; `createdAt`/`updatedAt` `defaultNow()`
- Role/status/type columns via `$type<"..."|"...">()` unions — no enums (erasableSyntaxOnly)
- `card_embedding.embedding` uses `vector("embedding", { dimensions: 1536 })` from `drizzle-orm/pgvector-core` with HNSW cosine index
- `card_version` immutable rows keyed by unique `(cardId, versionNo)`; `card` has `is_closed/closed_by/closed_at` + unique `(projectId, slug)`
- All re-exported from `packages/schemas/src/index.ts` (19 new lines)

### Task 2 — Zod validations (committed `d8f1940`)

Created `packages/schemas/src/validations/{org,project,card,proposal}.ts`:

- `org.ts`: `ROLE_ENUM`, `createOrgSchema`, `inviteMemberSchema`, `acceptInviteSchema`, `updateMemberRoleSchema` + `*Input` types
- `project.ts`: `createProjectSchema` with `DEFAULT_PROJECT_COLUMNS` (5 standard columns), customFields type enum validation
- `card.ts`: `CARD_STATUSES`, `CARD_PRIORITIES`, `createCardSchema`, `updateCardSchema` (`.strict()` — rejects `is_closed`/`closed_by`/`closed_at` smuggling), `closeCardSchema`
- `proposal.ts`: `createProposalInputSchema`, `rejectProposalSchema`
- All re-exported from `packages/schemas/src/index.ts`

### Task 3 — Pgvector + migration + tests

- `docker-compose.yml`: postgres image swapped to `pgvector/pgvector:0.8.6-pg16`
- Generated migration `0001_yellow_manta.sql` via `bun --filter @workspace/db generate`
- Prepend-only edit: first statement is `CREATE EXTENSION IF NOT EXISTS vector;`
- Recreated postgres container (forced `--force-recreate` after volume reset — stale `pgdata` volume from a previous init had no `template` role) and applied with `bun --filter @workspace/db migrate`
- Verified: 13 new tables + vector extension live (`\dt` → 18 tables incl. existing Better Auth tables; `pg_extension` shows `vector`)
- Created `packages/schemas/src/__tests__/validations.test.ts` (13 tests) covering org/project/card validation incl. strict-rejection of `is_closed` and enum cases

## Verification Results

| Check                                       | Result                                          |
| ------------------------------------------- | ----------------------------------------------- |
| `bun --filter @workspace/schemas typecheck` | ✅ pass                                         |
| `bun --filter @workspace/schemas lint`      | ✅ pass                                         |
| `bun --filter @workspace/schemas test`      | ✅ 24 tests pass (13 new)                       |
| `bun --filter @workspace/db generate`       | ✅ one migration, 13 CREATE TABLEs + HNSW index |
| Migration SQL first statement               | ✅ `CREATE EXTENSION IF NOT EXISTS vector;`     |
| `bun --filter @workspace/db migrate`        | ✅ succeeded                                    |
| psql `\dt` / `\dx`                          | ✅ 13 tables + vector extension                 |

## Notes / Deviations

- **Env loading**: `bun --filter @workspace/db migrate` requires `DATABASE_URL` explicitly (Bun doesn't auto-load root `.env` from workspace CWD). Run as `DATABASE_URL="postgres://template:template@localhost:5432/template" bun --filter @workspace/db migrate`.
- **Volume reset**: the `pgdata` volume held data initialized with a different superuser; reset so `template` role + `vector` extension initialize cleanly. No data lost (fresh DB).
- No new npm packages required (pgvector support bundled in drizzle-orm 0.43).

## Commit History (this plan)

- `a854585` feat(schemas): add 13 core loop Drizzle tables with pgvector embedding column
- `d8f1940` feat(schemas): add zod request validations for org, project, card, proposal
- (task 3 commit) chore(db): enable pgvector, generate/apply migration, add validation tests
