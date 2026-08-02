---
phase: 01-core-loop-mvp-differentiator
plan: 8
subsystem: testing
tags: [playwright, e2e, mailpit, mock-ai, isolation]

# Dependency graph
requires:
  - phase: 01-02
    provides: mock AI provider with stable loyalty-program cards
  - phase: 01-06
    provides: web hooks + chat page with prompt-input / clarify-answer testids
  - phase: 01-07
    provides: board data-testids (board-card, approve-proposal, copy-link, history-tab)
provides:
  - Four Playwright E2E journeys (signup→personal org→project→prompt→proposal→approve→board→versions→close→replacement→cross-org isolation)
  - Deterministic mock-AI wiring (AI_PROVIDER=mock) for the E2E API server
  - Isolated test database lifecycle (create/migrate/seed per run, drop after)
  - Fixes: Better Auth credential-provider seed, proposals count GROUP BY bug, useCards/useProject query-key collision, project-scoped API calls from web hooks, close-card UI + card-detail invalidation, configurable rate limits
affects: [Phase 2 (graph & collaboration), Phase 3 (SaaS hardening) — E2E journeys extend per phase]

# Tech tracking
tech-stack:
  added:
    - "@better-auth/utils@0.4.2" (apps/e2e — password hashing for seeded users, matches Better Auth 1.6.19 scrypt format)
  patterns:
    - Playwright webServer command runs DB prepare (create/migrate/seed) before starting the API — avoids the globalSetup-after-webServer ordering race
    - Deterministic test DB URL derived from DATABASE_URL (…_e2e suffix) so the API server and global teardown agree without a shared state file
    - Seed uses providerId "credential" matching Better Auth's email/password account linkage

key-files:
  created:
    - apps/e2e/src/core-loop.test.ts
    - apps/e2e/src/prepare-test-db.ts
    - apps/e2e/eslint.config.js
  modified:
    - apps/e2e/src/seed.ts
    - apps/e2e/playwright.config.ts
    - apps/e2e/src/db.ts
    - apps/e2e/src/global-teardown.ts
    - apps/e2e/src/smoke.test.ts
    - apps/e2e/package.json
    - apps/api/src/routes/proposals.ts
    - apps/api/src/app.ts
    - apps/web/src/hooks/use-ai.ts
    - apps/web/src/hooks/use-cards.ts
    - apps/web/src/hooks/use-proposals.ts
    - apps/web/src/routes/project-board.tsx
    - apps/web/src/components/proposal-review.tsx
    - apps/web/src/components/card-drawer.tsx
    - apps/web/src/components/__tests__/card-drawer.test.tsx
    - .gitignore

key-decisions:
  - "Move test DB preparation into the API webServer command instead of globalSetup: Playwright starts webServer before globalSetup, so a DB created in globalSetup is unreachable when the API boots."
  - "Seed Better Auth users with providerId 'credential' (not 'email') to match better-auth 1.6.19's email/password account linkage, and hash with @better-auth/utils/password so the scrypt format verifies."
  - "Fetch the verification URL from mailpit's message detail endpoint (/api/v1/message/{ID}) because the list endpoint only returns a snippet, not the Text body."
  - "Make AI/auth rate limits configurable via env (AI_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_MAX) and raise them for the E2E run to avoid 429s under parallel workers."

patterns-established:
  - "E2E isolation: per-run test database (name + _e2e), migrated + seeded deterministically, dropped in global teardown."
  - "UI data-testids are the E2E contract: prompt-input, clarify-answer, proposal-item, approve-proposal, reject-proposal, board-card, close-card, copy-link, history-tab, similar-list, closed-card, closed-rail-toggle."

requirements-completed: [E2E-01]

# Metrics
duration: 180min
completed: 2026-08-02
---

# Plan 08: Phase 1 E2E Journeys Summary

Four Playwright journeys automate the complete Phase 1 core loop — signup, personal org, project creation, mock-AI proposal generation, approval, live board with version history, card closure with replacement, and cross-org isolation — all deterministic via the mock AI provider against an isolated per-run test database.

## Performance

- **Duration:** ~3h (infra debugging dominated — Playwright webServer/globalSetup ordering, Better Auth seed format, mailpit API shape)
- **Completed:** 2026-08-02
- **Tasks:** 2 planned
- **Files modified:** 18

## Accomplishments

- J1: signup → personal org → project → prompt → proposal appears (AI-01, ORG-01, APPR-03)
- J2: approve proposal → cards live on board → card drawer shows v1 version history (APPR-01/02, DATA-02, UI-04/05)
- J3: close card freezes it (closed rail) → follow-up prompt creates replacement proposal → approve → new cards live (AI-04, closed semantics)
- J4: User B cannot see or access User A's project (ORG-01/04, DATA-06)
- Smoke tests updated for the new landing/login flows and all 9 E2E tests pass

## Task Commits

This plan's work is committed in a cohesive e2e feature commit (the repo convention commits each plan's output atomically):

1. **Task 1 + 2 (seed + journeys + infra fixes)** — committed together as the plan's feature commit

**Plan metadata:** (included in the same feature commit — `docs` content)

## Files Created/Modified

- `apps/e2e/src/core-loop.test.ts` - J1–J4 core-loop journeys
- `apps/e2e/src/prepare-test-db.ts` - creates/migrates/seeds the test DB before the API webServer boots
- `apps/e2e/src/seed.ts` - TEST_USER_B + credential-provider password hashing
- `apps/e2e/playwright.config.ts` - prepare-in-webServer command, deterministic test DB URL, AI_PROVIDER=mock, raised rate limits
- `apps/e2e/src/db.ts` - Windows-safe STATE_FILE path
- `apps/e2e/src/global-teardown.ts` - Windows-safe STATE_FILE path
- `apps/e2e/src/smoke.test.ts` - assertions aligned to actual page markup (CardTitle is a div, not a heading)
- `apps/e2e/eslint.config.js` - missing ESLint config for the workspace
- `apps/api/src/routes/proposals.ts` - fix Postgres GROUP BY bug (count aggregate instead of selecting proposalChange.id)
- `apps/api/src/app.ts` - env-configurable AI/auth rate limits
- `apps/web/src/hooks/use-ai.ts` - pass ?project= slug to generate/process/clarify (resolveOrgFromProject needs it)
- `apps/web/src/hooks/use-cards.ts` - fix useCards/useProject query-key collision; card-detail invalidation on close
- `apps/web/src/hooks/use-proposals.ts` - pass ?project= slug
- `apps/web/src/routes/project-board.tsx` - pass projectSlug through
- `apps/web/src/components/proposal-review.tsx` - projectSlug prop
- `apps/web/src/components/card-drawer.tsx` - close-card button + card-detail invalidation
- `apps/web/src/components/__tests__/card-drawer.test.tsx` - mock useCloseCard
- `.gitignore` - ignore playwright-report/ test-results/ .e2e-state.json

## Decisions Made

1. **DB prep in the webServer command, not globalSetup** — Playwright starts webServers before globalSetup runs; a test DB created only in globalSetup would not exist when the API boots. The API webServer command now runs `prepare-test-db.ts && bun run dev`.
2. **Seed users with `providerId: "credential"`** — Better Auth 1.6.19 links email/password accounts under the "credential" provider id and verifies via `@better-auth/utils/password` scrypt. Seeding with "email" caused "Credential account not found".
3. **Mailpit detail endpoint** — `/api/v1/messages` returns only `Snippet`; the verification URL lives in `Text` on `/api/v1/message/{ID}`.
4. **Configurable rate limits** — AI (10/min) and auth (30/min) limits caused 429s across parallel E2E workers. Now env-configurable; E2E raises them (AI 100, auth 500).

## Deviations from Plan

### Auto-fixed Issues

**1. E2E-02 — Playwright webServer/globalSetup ordering race**

- **Found during:** Task 1 (infra wiring)
- **Issue:** The API webServer started before globalSetup wrote `.e2e-state.json`, so the API fell back to the source DB; and a prepare-in-globalSetup DB was unreachable at API boot.
- **Fix:** Moved create/migrate/seed into the API webServer command (`prepare-test-db.ts`); removed globalSetup; kept globalTeardown for drop.
- **Files modified:** `apps/e2e/playwright.config.ts`, `apps/e2e/src/global-setup.ts` (deleted), `apps/e2e/src/prepare-test-db.ts` (new)
- **Verification:** full E2E suite passes; test DB dropped after run

**2. E2E-03 — Seed wrote to the source DB (import-time env binding)**

- **Found during:** Task 1
- **Issue:** `@workspace/db`'s client reads `process.env.DATABASE_URL` at import; global-setup imported it statically before reassigning to the test DB, so seed hit the source DB → duplicate-key on re-runs.
- **Fix:** `prepare-test-db.ts` sets the env then dynamically imports `@workspace/db` + seed.
- **Files modified:** `apps/e2e/src/global-setup.ts`, `apps/e2e/src/prepare-test-db.ts`
- **Verification:** fresh seed each run, no duplicate-key

**3. E2E-04 — Better Auth "Credential account not found" on seeded sign-in**

- **Found during:** smoke tests
- **Issue:** Seed inserted accounts with `providerId: "email"`; Better Auth expects `"credential"`.
- **Fix:** Changed to `providerId: "credential"` + `@better-auth/utils/password` hashing (matches the 0.4.2 utils bundled with better-auth 1.6.19).
- **Files modified:** `apps/e2e/src/seed.ts`, `apps/e2e/package.json`
- **Verification:** seeded-user sign-in test passes

**4. API-BUG — proposals list 500 (Postgres 42803)**

- **Found during:** J1 board load
- **Issue:** `select({ changeCount: proposalChange.id }).groupBy(proposal.id)` — the left-joined column must be aggregated.
- **Fix:** `count(proposalChange.id)` aggregate.
- **Files modified:** `apps/api/src/routes/proposals.ts`
- **Verification:** `/api/proposals?project=` returns 200; J1 proposal renders

**5. WEB-BUG — "cards.filter is not a function"**

- **Found during:** J1 board load
- **Issue:** `useCards` and `useProject` shared query key `["project", slug]` but returned different shapes.
- **Fix:** `useCards` → `["project", slug, "cards"]`.
- **Files modified:** `apps/web/src/hooks/use-cards.ts`
- **Verification:** board renders cards

**6. WEB-BUG — AI/card/proposal routes 404 "Not Found"**

- **Found during:** J1 prompt
- **Issue:** web hooks posted to `/api/ai/generate` etc. without `?project=`; `resolveOrgFromProject` requires the project slug query param to resolve org scope.
- **Fix:** appended `?project=<slug>` to generate/process/clarify, card detail/versions/similar/comments, move/close, proposal list/detail/approve/reject calls.
- **Files modified:** `apps/web/src/hooks/use-ai.ts`, `use-cards.ts`, `use-proposals.ts`, `proposal-review.tsx`, `project-board.tsx`
- **Verification:** J1 prompt → proposal appears

**7. WEB-FEATURE — no close-card UI**

- **Found during:** J3
- **Issue:** `useCloseCard` existed but nothing rendered a close action; card detail didn't refresh after closing.
- **Fix:** Added "Close card" button to the drawer header (data-testid=close-card, hidden when closed); invalidate `["card", cardId]` on success.
- **Files modified:** `apps/web/src/components/card-drawer.tsx`, `use-cards.ts`, card-drawer test mock
- **Verification:** J3 closes card → closed rail + read-only banner

**8. E2E-05 — rate-limit 429s under parallel workers**

- **Found during:** full suite run (J4 auth, J3 AI)
- **Issue:** Fixed AI=10/min and auth=30/min limits exhausted by parallel tests.
- **Fix:** `AI_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` env overrides; E2E sets AI=100, auth=500.
- **Files modified:** `apps/api/src/app.ts`, `apps/e2e/playwright.config.ts`
- **Verification:** 9/9 tests pass under 6 workers

---

**Total deviations:** 8 auto-fixed
**Impact on plan:** All auto-fixes were necessary for correctness/security. No scope creep beyond making the E2E journeys pass.

## Issues Encountered

- **Windows path handling** in `.e2e-state.json` (`new URL(...).pathname` yields a leading slash on Windows) → switched to `fileURLToPath`.
- **Mailpit API shape** — list endpoint lacks `Text`; added detail fetch.
- **CardTitle is a `div`** in shadcn — smoke assertions moved from `getByRole('heading')` to visible description text.
- **`expect.poll`/`toHaveURL` type errors** — removed unsupported `message` option.

## User Setup Required

None - no external service configuration required. E2E runs require the repo's standard dev infrastructure: `docker compose up -d postgres mailpit` and `bun install`.

## Next Phase Readiness

- Phase 1 E2E regression net is green (9/9) and deterministic with `AI_PROVIDER=mock`.
- The four journeys map 1:1 to the milestone success criteria (personal org, prompt→proposal→approve→board, version history, closed→replacement, cross-org isolation).
- Phase 2 (graph & collaboration) and Phase 3 (SaaS hardening) extend `apps/e2e/src/core-loop.test.ts` with new journeys and the same isolated-test-DB pattern.

---

_Phase: 01-core-loop-mvp-differentiator_
_Completed: 2026-08-02_
