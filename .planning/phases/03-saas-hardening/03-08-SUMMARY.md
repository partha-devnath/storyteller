---
phase: 03-saas-hardening
plan: 08
subsystem: infra
tags: [deployment, docker, ci, github-actions, env-vars, vite, e2e]

# Dependency graph
requires:
  - phase: 03-saas-hardening
    provides: env.ts runtime env contract (03-01), billing stripe/mock provider + webhook (03-02), EnvIndicator reading import.meta.env.VITE_APP_ENV (03-04)
provides:
  - DEPLOYMENT.md — environments, env var table, build, migration-as-deploy-step, CI gates, rollout/rollback, security notes, verified commands
  - VITE_APP_ENV build-time wiring through apps/web/Dockerfile (ARG/ENV) + docker-compose (build args + environment) so the staging env badge renders
  - CI e2e job: postgres+mailpit via docker compose, .env provisioning, Playwright chromium, DATABASE_URL-driven test:e2e
  - API Dockerfile frozen-lockfile fix (apps/e2e manifest copy)
affects: [verification, ship, milestone archive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Build-time env baking: VITE_* ARG/ENV pairs in the web Dockerfile builder stage — runtime env is too late for a static dist"
    - "Workspace-complete manifest copy: Dockerfile base stages must copy every workspace package.json (api, web, e2e) so bun install --frozen-lockfile matches bun.lock"
    - "CI e2e job shape: docker compose up infra → wait loops → provision .env from .env.example → playwright install → test:e2e with DATABASE_URL"

key-files:
  created:
    - DEPLOYMENT.md
  modified:
    - apps/web/Dockerfile
    - docker-compose.yml
    - apps/api/Dockerfile
    - .github/workflows/ci.yml

key-decisions:
  - "VITE_APP_ENV baked at build time (default production) — runner serves static dist, runtime env too late; staging builds pass VITE_APP_ENV=staging to render the env badge"
  - "CI e2e job provisions apps/api/.env + apps/web/.env from .env.example — .env files are gitignored, so EMAIL_PROVIDER=mailpit and VITE_API_URL must be recreated in CI for the mailpit-dependent journeys"
  - "API Dockerfile copies apps/e2e/package.json — frozen-lockfile install needs the full workspace set present to match bun.lock"

patterns-established:
  - "Dockerfile build verification is part of the deploy gate: docker compose build api web must pass locally and in CI"

requirements-completed: [E2E-03]

# Metrics
duration: 13min
completed: 2026-08-02
---

# Phase 3 Plan 8: Deployment Polish — Pipeline Documentation + Verified Builds Summary

**DEPLOYMENT.md staging/production pipeline (environments, full env var table, migration-as-deploy-step, CI gates, rollout/rollback, security notes), VITE_APP_ENV build-time wiring through the web Dockerfile + compose so the staging badge renders, a new CI e2e job, and verified docker + turbo builds — including a pre-existing API Dockerfile frozen-lockfile fix.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-08-02T19:42:28Z
- **Completed:** 2026-08-02T19:56:00Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- DEPLOYMENT.md at repo root: 3-environment table (dev mock / staging badge / prod stripe), the complete env var contract from `apps/api/src/env.ts` + web build-time VITE\_\* vars, dockerized + turbo build paths, migrations as a separate pre-traffic deploy step (explicit `DATABASE_URL` command, no-auto-migrate convention), CI gate list, additive-only rollback flow, and security notes (webhook signature verification, server-side limits, secrets handling)
- VITE_APP_ENV ARG/ENV pair added to the web Dockerfile builder (default `production`, beside the VITE_API_URL pair) + build args/environment passthrough in docker-compose — staging deploys build with `VITE_APP_ENV=staging` to render the `env-badge`; production and dev render nothing (T-03-72 accepted)
- CI e2e job added: checkout → setup-bun 1.3.5 → cache → frozen install → `docker compose up -d postgres mailpit` → wait loops (pg_isready + mailpit API) → `.env.example` copies (EMAIL_PROVIDER=mailpit, VITE_API_URL) → Playwright chromium install → `bun run test:e2e` with `DATABASE_URL` → playwright-report artifact on failure
- Pre-existing API Dockerfile bug fixed: `bun install --frozen-lockfile` failed ("lockfile had changes") because the base stage copied only api+web manifests while bun.lock includes the e2e workspace — added the `apps/e2e/package.json` COPY line; `docker compose build api web` now builds both images
- Full-suite verification green on 2026-08-02: lint 12/12, typecheck 12/12, turbo build 2/2, compose config exit 0, docker images built — all recorded in DEPLOYMENT.md's verified-commands table

## Task Commits

Each task was committed atomically:

1. **Task 1: VITE_APP_ENV wiring through web Dockerfile + docker-compose** - `7ae6f15` (feat)
2. **Task 2: DEPLOYMENT.md staging/production pipeline documentation** - `02cf87b` (docs)
3. **Task 3: CI gate check + full repo build verification** - `29b2270` (feat)

## Files Created/Modified

- `DEPLOYMENT.md` - created; shippable deployment doc (Environments, Environment Variables, Build, Database Migrations, CI Gates, Rollout & Rollback, Security Notes, Verified Commands)
- `apps/web/Dockerfile` - ARG VITE_APP_ENV=production + ENV VITE_APP_ENV in the builder stage (baked at build time)
- `docker-compose.yml` - web service build args + environment VITE_APP_ENV `${VITE_APP_ENV:-production}` with staging comment
- `apps/api/Dockerfile` - added `COPY apps/e2e/package.json` so the workspace set matches bun.lock (frozen install fix)
- `.github/workflows/ci.yml` - new `e2e` job (lint/typecheck/build/test existed)

## Decisions Made

- VITE_APP_ENV baked at build time with `production` default — the runner serves static dist, so runtime env cannot affect the bundle; staging passes the build arg explicitly (T-03-72: a misconfigured build only mis-shows a badge)
- CI e2e job recreates the gitignored `.env` files from `.env.example` — the API needs `EMAIL_PROVIDER=mailpit` (journeys fetch verification links from mailpit API :8025) and the web dev server needs `VITE_API_URL`
- API Dockerfile keeps `--frozen-lockfile` (reproducible builds) and fixes the workspace-set mismatch by copying the e2e manifest rather than dropping the frozen flag

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `docker compose build api web` failed — bun install --frozen-lockfile: "lockfile had changes"**

- **Found during:** Task 3 (full container build verification)
- **Issue:** The API Dockerfile base stage copied only `apps/api` + `apps/web` package.json and `packages/`, but bun.lock also contains the `e2e` workspace — the frozen install saw a partial workspace set and rejected the lockfile. Pre-existing latent bug: CI's build job runs `bun run build` (turbo), never the docker build, so it had never surfaced.
- **Fix:** Added `COPY apps/e2e/package.json ./apps/e2e/` so the manifest set matches bun.lock; kept `--frozen-lockfile` for reproducible builds.
- **Files modified:** apps/api/Dockerfile
- **Verification:** `docker compose build api web` → both `storyteller-web` and `storyteller-api` images built
- **Committed in:** 29b2270 (Task 3 commit)

**2. [Rule 2 - Missing Critical] CI e2e job needed .env provisioning + Playwright browser install to be runnable**

- **Found during:** Task 3 (e2e job design)
- **Issue:** The plan's e2e job sketch (infra up → test:e2e) omits two hard requirements: (a) `.env` files are gitignored, so in CI the API would default to `EMAIL_PROVIDER=console` and break the mailpit-API-dependent journeys, and the web dev server would lose `VITE_API_URL`; (b) `@playwright/test` does not auto-install browsers, so the suite would fail with "browser not found".
- **Fix:** Added `cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env` and `bunx playwright install --with-deps chromium` steps; added wait loops (pg_isready, mailpit API :8025) and a playwright-report artifact upload on failure.
- **Files modified:** .github/workflows/ci.yml
- **Verification:** YAML validates; job structure mirrors the test job with the phase-3 infra requirements
- **Committed in:** 29b2270 (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes required for the plan's own verification commands to pass and for the CI e2e job to be functional. No scope creep — no behavior change beyond the plan's contract.

## Issues Encountered

- Task 1 commit rejected by commitlint (`body-max-line-length` 100) — rewrote the body with shorter lines and recommitted; no code change.
- The API Dockerfile frozen-lockfile failure was the only unexpected build break; root cause confirmed by reading the COPY lines vs bun.lock workspace list (web Dockerfile used plain `bun install`, masking the issue).

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. Build-time VITE\_\* vars are documented as public (T-03-70 mitigated); staging badge is display-only (T-03-72 accepted); production BILLING_PROVIDER=stripe is documented as mandatory (T-03-73 mitigated); migrations stay additive-only and pre-traffic (T-03-71 mitigated).

## User Setup Required

**External services require manual configuration.** See [03-saas-hardening-USER-SETUP.md](./03-saas-hardening-USER-SETUP.md) for:

- Staging/production env: STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / STRIPE_PRICE_PRO (Stripe Dashboard), AI_PROVIDER=openai + OPENAI_API_KEY, VITE_APP_ENV=staging build arg, BILLING_PROVIDER=stripe
- Full var table documented in DEPLOYMENT.md; no keys are committed

## Next Phase Readiness

- **Success criterion 4 met:** staging/production deployment pipeline documented end to end with verified command output (lint/typecheck/build/compose/docker builds, 2026-08-02)
- Env indicator wired per environment: staging badge via VITE_APP_ENV build arg; nothing in prod/dev
- CI gates complete: lint, typecheck, build, test (existing) + e2e (new)
- Ready for: phase verification (`/gsd-verify-work`), then milestone archive — Phase 3 is the final phase of milestone v2.0

---

_Phase: 03-saas-hardening_
_Completed: 2026-08-02_

## Self-Check: PASSED

- All 5 files verified present on disk (`[ -f ]`: DEPLOYMENT.md, apps/web/Dockerfile, docker-compose.yml, apps/api/Dockerfile, .github/workflows/ci.yml)
- All 3 task commits verified in git log: 7ae6f15, 02cf87b, 29b2270
- `bun run lint`: 12/12 tasks pass; `bun run typecheck`: 12/12 tasks pass; `bun run build`: 2/2 tasks pass
- `docker compose config -q`: exit 0; `docker compose build api web`: both images built
- DEPLOYMENT.md section-check node script: exit 0 (all six required headings present)
- ci.yml: YAML valid; e2e job present (line 86) starting postgres+mailpit then running test:e2e
