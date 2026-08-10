# AGENTS.md

## Project overview

Full-stack monorepo template — Bun, Vite, React 19, Hono, Better Auth, Drizzle ORM, PostgreSQL. Managed with Turborepo.

## Commit conventions

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint. Commits are rejected if they don't match.

**Format**: `<type>: <description>`

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `refactor` | Code restructure, no behavior change |
| `docs`     | Documentation only                   |
| `style`    | Formatting, whitespace (no logic)    |
| `test`     | Add or update tests                  |
| `chore`    | Tooling, deps, config                |
| `perf`     | Performance improvement              |

**Rules**:

- Header max 100 characters (`header-max-length`)
- Type must be present (`type-empty`)
- Description must be present (`subject-empty`)
- Body and footer are optional

**Examples**:

```
feat: add email verification flow
fix: handle null session in auth middleware
refactor: migrate logger from Pino to Winston
chore: bump bun to 1.3.5
```

## Commands

```bash
bun dev              # Start all apps in dev mode
bun run build        # Build all workspaces
bun run lint         # ESLint on all workspaces
bun run typecheck    # TypeScript type checking
bun run format       # Prettier formatting
bun run test         # Vitest (run)
bun run test:watch   # Vitest (watch)
```

## Managing the project

### First-time setup

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL + Mailpit
docker compose up -d

# 3. Copy env files (root .env is used by docker compose + e2e)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Set BETTER_AUTH_SECRET (32+ random chars) in .env and apps/api/.env

# 5. Apply existing migrations (only run `generate` after a schema change)
bun --filter @workspace/db migrate

# 6. Start dev servers
bun dev
```

- API → http://localhost:3001, Web → http://localhost:5173, Mailpit UI → http://localhost:8025, floci S3 → http://localhost:4566
- `VITE_*` env vars are baked at Vite startup — restart `bun dev` after changing `apps/web/.env`

### Dev workflow (change → verify)

1. Locate the code (`cavecrew-investigator`), keep the change scoped to 1–2 files (`cavecrew-builder`)
2. Add or update tests in `src/__tests__/` next to the code — no tests, no feature
3. Run focused checks first, then the full gate:

```bash
bun --filter api test         # API unit/integration (bun test)
bun --filter web test         # Web unit (vitest)
bun run test:e2e              # Playwright E2E (dev servers must be running)
bun run typecheck && bun run lint
bun run format                # Prettier — run before committing
```

4. Run E2E whenever a user-facing flow (auth, board, chat, billing) is touched
5. Delegate diff review to `cavecrew-reviewer` before committing

### Git flow

- `main` is stable — work on feature branches (`feat/<topic>`), merge when green
- One logical change per commit (atomic). Schema change + its migration go in the same commit
- Conventional Commits enforced by commitlint via husky — `<type>: <subject>` (see table above)
- Never commit secrets; `.env` files are gitignored — run `git status` and `git diff` before `git add`

### Troubleshooting

| Symptom                                   | Fix                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| DB connection refused                     | `docker compose up -d`, then `docker compose ps`                                         |
| Port already in use (3001/5173/5432/8025) | Find and stop the process holding it, then restart `bun dev`                             |
| `Cannot find module @workspace/x`         | `bun install` — workspace packages resolve via node_modules symlinks                     |
| Migration not applied                     | `bun --filter @workspace/db migrate`                                                     |
| Schema changed but no migration           | `bun --filter @workspace/db generate`, review the SQL, then `migrate`                    |
| Need a clean database                     | `docker compose down -v && docker compose up -d`, then `migrate`                         |
| Emails not arriving                       | Check Mailpit at http://localhost:8025, or set `EMAIL_PROVIDER=console` to log to stdout |
| S3 uploads fail locally                   | Ensure floci is up at http://localhost:4566 and `S3_ENDPOINT` is set                     |
| Web picks up stale env                    | Restart `bun dev` — `VITE_*` vars are read at startup                                    |

## Project conventions

- **Runtime**: Bun (not Node). Use Bun-native APIs (`Bun.file()`, `Bun.env`, `Bun.serve()`)
- **Validation**: Zod for runtime validation of env vars, inputs, and API responses
- **Shared packages**: `@workspace/*` scope — internal only, never published
- **Database**: Drizzle ORM for schema and migrations — never write raw SQL
- **Backend**: Hono factory helpers (`createFactory`, `createApp`) for typed middleware and route creation
- **UI**: shadcn/ui components from `packages/ui/` — don't copy into apps. Always check shadcn first before building a component from scratch.
- **Exports**: No default exports — use named exports everywhere
- **Types**: Prefer `type` imports, export types alongside implementations
- **Environment**: `.env` files per app (never hardcode secrets), Zod-validated at startup
- **Testing**: Vitest with coverage via `@vitest/coverage-v8`
- **Test locations**: `__tests__/` directories next to source (e.g., `src/__tests__/app.test.ts`)
- **API testing**: `apps/api` uses `bun test` + `bun:test` imports; other workspaces use `vitest`
- **Package resolution**: Packages export raw `.ts` source (no build step). Bun and Vite consume TypeScript directly. Drizzle Kit resolves schemas via `node_modules/@workspace/schemas` symlink.
- **Security**: Manual security headers middleware (CSP, HSTS, etc.) — no helmet library
- **Rate limiting**: In-memory `Map` with `setInterval` cleanup (`.unref()` to not block shutdown)
- **Dependencies**: Pinned to exact versions (`.npmrc` sets `save-exact=true`)
- **TypeScript**: `erasableSyntaxOnly` enabled across all `tsconfig.json` — no enums, namespaces, or non-type-erasable syntax
- **Subagents**: Use subagents wherever possible — delegate code location (`cavecrew-investigator`), surgical 1–2 file edits (`cavecrew-builder`), and diff/branch review (`cavecrew-reviewer`). Keep main-thread context small by pushing investigative and mechanical work to subagents. Do NOT spawn subagents for trivial one-line answers or features needing 3+ file coordination.

## Package structure

```
packages/
├── ui/          @workspace/ui        shadcn/ui components + utility hooks
├── schemas/     @workspace/schemas   Drizzle tables + Zod schemas + TS types + file validations
├── db/          @workspace/db        Drizzle client + migration runner + drizzle-kit config
├── auth/        @workspace/auth      Better Auth server instance
├── email/       @workspace/email     EmailSender interface + providers (console, mailpit, resend)
├── logger/      @workspace/logger    Winston (server) + styled console (browser)
└── files/       @workspace/files     S3 storage adapter + upload helper
```

All packages are imported via `@workspace/*` aliases. Each has granular subpath exports (e.g., `@workspace/schemas/validations/*`, `@workspace/logger/browser`). Both TypeScript path aliases and Vite aliases are configured to resolve raw `.ts` source.

## Database migrations

```bash
bun --filter @workspace/db generate   # Diff schema → create SQL migration + update snapshot
bun --filter @workspace/db migrate     # Apply all pending migrations
bun --filter @workspace/db studio      # Open Drizzle Studio GUI
```

Tables go in `packages/schemas/src/db/`, re-exported from `packages/schemas/src/index.ts`. The API does NOT auto-migrate on startup — migrations run separately.

## What to use when

| When you need to…                    | Use this                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Run a server                         | `Bun.serve()` + Hono `fetch` handler                                                                                      |
| Create typed API routes              | `hono/factory` (`createFactory`, `createApp`)                                                                             |
| Validate input / env / API responses | Zod schemas from `@workspace/schemas`                                                                                     |
| Query or mutate the database         | Drizzle client from `@workspace/db`                                                                                       |
| Add a new database table             | `pgTable` in `packages/schemas/src/db/` + re-export                                                                       |
| Authenticate a user / check session  | Better Auth from `@workspace/auth`                                                                                        |
| Send an email                        | `EmailSender` from `@workspace/email`                                                                                     |
| Upload / serve files                 | S3 adapter from `@workspace/files`                                                                                        |
| Log something                        | Winston logger from `@workspace/logger`                                                                                   |
| Fetch data in React                  | TanStack React Query (`useQuery` / `useMutation`)                                                                         |
| Manage form state                    | React Hook Form + Zod resolver                                                                                            |
| Manage global client state           | Zustand stores                                                                                                            |
| Style a component                    | Tailwind CSS v4 utility classes                                                                                           |
| Add a reusable UI component          | `bun --filter @workspace/ui add <component>` (shadcn/ui install) — never build from scratch before checking shadcn has it |
| Run a one-off script                 | `bun run path/to/script.ts`                                                                                               |
| Add a dev dependency                 | Root `package.json`                                                                                                       |
| Add an app/package dependency        | That workspace's `package.json`                                                                                           |

## Reference docs

### Backend

- [Hono — Getting started with Bun](https://hono.dev/docs/getting-started/bun)
- [Hono — Factory helper](https://hono.dev/docs/helpers/factory)
- [Hono — CORS middleware](https://hono.dev/docs/middleware/builtin/cors)
- [Hono — Best practices](https://hono.dev/docs/guides/best-practices)
- [Better Auth — Installation](https://better-auth.com/docs/installation)
- [Better Auth — Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth — Email verification](https://better-auth.com/docs/concepts/email-verification)
- [Better Auth — Client reference](https://better-auth.com/docs/reference/client)
- [Drizzle ORM — PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle ORM — Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)

### Frontend

- [React 19](https://react.dev/reference/react)
- [React Router](https://reactrouter.com/home)
- [TanStack React Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zod](https://zod.dev)
- [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Vite](https://vite.dev/guide/)

### Runtime & tooling

- [Bun](https://bun.sh/docs)
- [Turborepo](https://turbo.build/repo/docs)
- [Docker](https://docs.docker.com)
