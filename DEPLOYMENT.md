# Deployment

This document describes how Storyteller is built, tested, and shipped to **staging** and **production**. It is the deploy companion to the Phase 3 hardening work (billing, limits, onboarding, analytics) and covers the environment contract, the dockerized build path, the migration-as-deploy-step convention, the CI gates, and the rollout/rollback flow.

## Environments

| Environment    | Branch      | Env badge   | AI                            | Billing             | Purpose                                      |
| -------------- | ----------- | ----------- | ----------------------------- | ------------------- | -------------------------------------------- |
| **dev**        | any (local) | none        | `mock`                        | `mock`              | `docker compose up` local stack; E2E runs    |
| **staging**    | `develop`   | **Staging** | real provider (e.g. `openai`) | `stripe`            | pre-production validation with real services |
| **production** | `main`      | none        | real provider                 | `stripe` (required) | user-facing; migrations are a deploy step    |

- **dev** builds with `VITE_APP_ENV` unset → `production` default → the `EnvIndicator` renders nothing.
- **staging** builds with `VITE_APP_ENV=staging` → the amber **Staging** pill (`env-badge`) renders in the app shell.
- **production** builds with `VITE_APP_ENV=production` (default) → no badge. `BILLING_PROVIDER` **must** be `stripe`; the mock provider and its body-based webhook are dev/test only.

## Environment Variables

The API reads its configuration from `process.env` at startup, validated by `apps/api/src/env.ts` (Zod). Secrets are **never** committed — they live in the platform secret store per environment.

### API runtime vars

| Variable                                                                                           | Required in                     | Purpose                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                     | dev, staging, prod              | Postgres connection (used by API and by the migrate step)           |
| `BETTER_AUTH_SECRET`                                                                               | dev, staging, prod              | Auth session secret, ≥ 32 chars                                     |
| `BETTER_AUTH_URL`                                                                                  | dev, staging, prod              | Public auth base URL (e.g. `https://api.example.com/api/auth`)      |
| `CLIENT_URL`                                                                                       | staging, prod                   | Web app origin for CORS/redirects (default `http://localhost:5173`) |
| `PORT`                                                                                             | dev                             | API port (default `3001`)                                           |
| `LOG_LEVEL`                                                                                        | —                               | `fatal`–`trace` (default `info`)                                    |
| `EMAIL_PROVIDER`                                                                                   | staging, prod                   | `console` \| `mailpit` \| `resend` (default `console`)              |
| `MAILPIT_HOST`, `MAILPIT_SMTP_PORT`                                                                | dev                             | Mailpit SMTP endpoint (used when provider is `mailpit`)             |
| `EMAIL_FROM`                                                                                       | —                               | From address for outgoing mail                                      |
| `RESEND_API_KEY`                                                                                   | staging, prod (if `resend`)     | Resend API key                                                      |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_BASE_URL` | staging, prod                   | File storage (S3-compatible; localstack in dev)                     |
| `AI_PROVIDER`                                                                                      | staging, prod                   | `openai` \| `anthropic` \| `mock` (default `mock`; E2E uses `mock`) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`                                                             | staging, prod (per provider)    | AI provider key                                                     |
| `EMBEDDING_MODEL`                                                                                  | —                               | Default `text-embedding-3-small`                                    |
| `CHAT_MODEL`                                                                                       | —                               | Default `gpt-4o-mini`                                               |
| `BILLING_PROVIDER`                                                                                 | **production must be `stripe`** | `stripe` \| `mock` (default `mock`)                                 |
| `STRIPE_SECRET_KEY`                                                                                | staging, prod (`stripe`)        | Stripe secret key                                                   |
| `STRIPE_WEBHOOK_SECRET`                                                                            | staging, prod (`stripe`)        | Stripe webhook signing secret                                       |
| `STRIPE_PRICE_PRO`                                                                                 | staging, prod (`stripe`)        | Stripe price ID for the Pro plan                                    |

### Web build-time vars

`VITE_*` variables are **public** — Vite inlines them into the static bundle. Only non-secret values go here.

| Variable       | Values                              | Purpose                                                                             |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `VITE_API_URL` | e.g. `http://localhost:3001`        | API base URL baked into the bundle                                                  |
| `VITE_APP_ENV` | `staging` \| `production` (default) | Build-time env flag; `staging` renders the env badge, anything else renders nothing |

## Build

Dockerized production build (repo root):

```bash
docker compose build api web
```

This runs the per-app Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`). The web builder stage bakes `VITE_API_URL` and `VITE_APP_ENV` at build time:

```dockerfile
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_APP_ENV=production
ENV VITE_APP_ENV=$VITE_APP_ENV
```

For staging, override the build arg:

```bash
VITE_APP_ENV=staging docker compose build web
```

Or non-dockerized via Turborepo:

```bash
bun run build
```

The API runner serves the compiled `dist` and reads all configuration from `process.env` at runtime (Bun) — no secrets are baked into the API image. The web runner is a static file server (`bun x serve dist`).

## Database Migrations

Migrations run as a **separate deploy step before traffic is switched** — the API never auto-migrates on startup.

- Generate a migration locally after schema changes:

  ```bash
  bun --filter @workspace/db generate
  ```

- Apply it as part of the deploy, with the **explicit target `DATABASE_URL`** (Bun does not auto-load the root `.env` from the workspace CWD):

  ```bash
  DATABASE_URL="postgres://template:template@localhost:5432/template" bun --filter @workspace/db migrate
  ```

- Migrations are **additive-only** (new tables/columns; the Phase 3 `subscription` table is additive). Apply the migration **before** rolling out the new code that expects the new schema.

## CI Gates

`.github/workflows/ci.yml` runs on push to `main`/`develop` and on PRs to `main`. Every job must be green to merge:

1. **lint** — `bun run lint` (ESLint, turbo)
2. **typecheck** — `bun run typecheck` (tsc, turbo)
3. **build** — `bun run build` (turbo; api + web production builds)
4. **test** — `bun run test` (Vitest, repo-wide)
5. **e2e** — starts `postgres` + `mailpit` via docker compose, then `bun run test:e2e` (Playwright; Phase 3 billing/onboarding/analytics journeys included)

Commits additionally pass commitlint (Conventional Commits) via the husky hook.

## Rollout & Rollback

**Staging flow** (`develop`):

1. Merge to `develop` → CI gates run
2. Build images with `VITE_APP_ENV=staging`
3. Run migrations (`DATABASE_URL=... bun --filter @workspace/db migrate`)
4. Deploy api + web
5. Health check `GET /api/health` returns 200

**Production flow** (`main`):

1. Merge to `main` (gated by CI + review) → CI gates run
2. Build images (default `VITE_APP_ENV=production`, `BILLING_PROVIDER=stripe`)
3. Run migrations (additive-only)
4. Deploy api + web
5. Health check `GET /api/health`

**Rollback:** redeploy the previous image. Because migrations are additive-only and the subscription table is additive, a rollback does not require schema downgrades.

## Security Notes

- **Webhook signature verification** — the Stripe webhook route verifies the `STRIPE_WEBHOOK_SECRET` signature before processing events; the mock webhook path exists only when `BILLING_PROVIDER=mock` (dev/test).
- **Server-side limits** — plan limits are enforced server-side (`assertLimit`, 402 `limit_reached`); the UI only reflects server state.
- **Secrets** — keys are platform secrets, never committed; `VITE_*` build vars are public by design and contain no secrets.
- **Headers** — the API applies security headers (CSP, HSTS, etc.) in `app.ts`.

## Verified Commands

Full repo suite verified on **2026-08-02**:

| Command                        | Result                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `docker compose config -q`     | exit 0 — compose file valid                              |
| `bun --filter web build`       | success — Vite production build, `✓ built in 1.38s`      |
| `bun run build` (turbo)        | 2/2 tasks successful (api + web)                         |
| `bun run lint` (turbo)         | 12/12 tasks pass                                         |
| `bun run typecheck` (turbo)    | 12/12 tasks pass                                         |
| `docker compose build api web` | both images built — `storyteller-web`, `storyteller-api` |

Note: the API Dockerfile base stage copies `apps/e2e/package.json` alongside the api/web manifests so the workspace set matches `bun.lock` — required for `bun install --frozen-lockfile` to pass inside the container build.
