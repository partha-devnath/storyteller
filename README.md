# storyteller

Production-ready full-stack monorepo template using **Bun**, **Vite**, **React**, **Hono**, **Better Auth**, **Drizzle ORM**, and **PostgreSQL**.

## Stack

| Layer         | Technology                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| Runtime       | [Bun](https://bun.sh)                                                                         |
| Frontend      | [Vite](https://vite.dev) + [React 19](https://react.dev) + [shadcn/ui](https://ui.shadcn.com) |
| Backend       | [Hono](https://hono.dev)                                                                      |
| Auth          | [Better Auth](https://better-auth.com) — email/password, email verification, password reset   |
| Database      | [PostgreSQL](https://postgresql.org) + [Drizzle ORM](https://orm.drizzle.team)                |
| Forms         | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)                       |
| Data Fetching | [TanStack React Query](https://tanstack.com/query)                                            |
| State         | [Zustand](https://zustand-demo.pmnd.rs)                                                       |
| Logging       | [Winston](https://github.com/winstonjs/winston) (server) + styled console (browser)           |
| Storage       | S3-compatible adapter via `@workspace/files` (floci S3 / AWS S3 / LocalStack)                 |
| AWS Mock      | [floci](https://floci.dev) — local AWS services (ECR, S3, IAM, EC2, etc.)                     |
| Monorepo      | [Turborepo](https://turbo.build/repo)                                                         |
| Styling       | [Tailwind CSS v4](https://tailwindcss.com)                                                    |

## Project structure

```
├── apps/
│   ├── web/              Vite React frontend
│   │   ├── src/
│   │   │   ├── routes/       Auth pages + dashboard (login, signup, verify, reset)
│   │   │   ├── components/   ProtectedRoute, ErrorBoundary
│   │   │   ├── hooks/        use-auth, use-user (TanStack Query)
│   │   │   ├── providers/    QueryProvider, ThemeProvider, AppProvider
│   │   │   ├── stores/       Zustand app store example
│   │   │   └── lib/          Auth client (better-auth/react), API fetch wrapper
│   │   └── .env.example
│   └── api/              Hono backend
│       ├── src/
│       │   ├── app.ts        Hono app with CORS, auth routes, health check
│       │   ├── index.ts      Entry point (Bun serve)
│       │   ├── env.ts        Zod-validated environment
│       │   └── middleware/   Error handler
│       └── .env.example
├── packages/
│   ├── ui/               Shared shadcn/ui components
│   ├── schemas/          Drizzle ORM tables + Zod validation schemas + TS types
│   ├── db/               Drizzle client + migration runner
│   ├── auth/             Better Auth server instance
│   ├── email/            Email sender (console in dev, pluggable)
│   ├── logger/           Winston structured logger
│   └── files/            S3-compatible storage adapter + upload helper
├── docker-compose.yml    PostgreSQL + API + web services + mailpit
├── apps/api/Dockerfile   API multi-stage build
├── .dockerignore
├── turbo.json
└── package.json
```

## Quick start

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Docker](https://docker.com) (for PostgreSQL)

### Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url> my-project
cd my-project
bun install

# 2. Start PostgreSQL + Mailpit
docker compose up -d

# 3. Copy environment files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Edit your .env files (especially BETTER_AUTH_SECRET)
#    Generate a secret: bun -e "console.log(crypto.randomBytes(32).toString('hex'))"

# 5. Generate & run database migrations (see "Database Migrations" below)
bun --filter @workspace/db generate
bun --filter @workspace/db migrate

# 6. Start development servers
bun dev
```

This starts:

- **Frontend** → http://localhost:5173
- **API** → http://localhost:3001
- **Mailpit** → http://localhost:8025
- AWS services (S3, ECR, IAM, etc.) are provided by **floci** at `http://localhost:4566`

### Available commands

```bash
bun dev              # Start all apps in development mode
bun run build        # Build all packages and apps
bun run lint         # Run ESLint on all workspaces
bun run typecheck    # Run TypeScript type checking
bun run format       # Format code with Prettier

# Database (run from packages/db)
bun --filter @workspace/db generate   # Generate Drizzle migrations
bun --filter @workspace/db migrate    # Apply migrations
bun --filter @workspace/db studio     # Open Drizzle Studio
```

## Bootstrapping a new project

To start a new project from this template:

```bash
# 1. Copy to a new folder
cp -r storyteller my-project
cd my-project

# 2. Rename the root package
#    Edit package.json: "name": "my-project"

# 3. Update the HTML title
#    Edit apps/web/index.html: <title>my-project</title>

# 4. (Optional) Change DB credentials
#    Edit docker-compose.yml + .env + apps/api/.env:
#      POSTGRES_USER/PASSWORD/DB and DATABASE_URL

# 5. Generate a secret for auth
bun -e "const c = require('crypto'); console.log(c.randomBytes(32).toString('hex'))"
#    → paste this into .env as BETTER_AUTH_SECRET

# 6. Reinitialize git
rm -rf .git && git init && git add -A && git commit -m "Initial commit from template"

# 7. Install, start services, apply migrations
bun install
docker compose up -d
bun --filter @workspace/db generate
bun --filter @workspace/db migrate
bun dev
```

The **`@workspace/*` package scope** is internal only — never published to npm — so renaming it is unnecessary. It's just a monorepo convention for importing between packages.

## Auth flows

The template includes complete auth flows using Better Auth:

| Flow                | Route                       | Status |
| ------------------- | --------------------------- | ------ |
| Sign up             | `/signup`                   | ✅     |
| Email verification  | `/verify-email?token=...`   | ✅     |
| Sign in             | `/login`                    | ✅     |
| Forgot password     | `/forgot-password`          | ✅     |
| Reset password      | `/reset-password?token=...` | ✅     |
| Protected routes    | `/dashboard`                | ✅     |
| API auth middleware | `/api/protected`            | ✅     |

All emails (verification, password reset) are captured by Mailpit in development. View them at http://localhost:8025. Set `EMAIL_PROVIDER=console` to log to stdout, or `EMAIL_PROVIDER=resend` for production.

## Database Migrations

This template uses **Drizzle ORM** + **drizzle-kit** for type-safe, code-first database migrations against PostgreSQL.

### How it works

1. **Define tables** in `packages/schemas/src/db/*.ts` using Drizzle's `pgTable` API.
2. **Re-export** each new table from `packages/schemas/src/index.ts`.
3. **Generate SQL** — drizzle-kit diffs your schema against the last snapshot and writes a `.sql` migration file.
4. **Apply** — run the migrator, which executes all pending SQL files in order.

### Creating a migration

```bash
# 1. Add or edit table definitions in packages/schemas/src/db/
#    Example: packages/schemas/src/db/posts.ts

# 2. Export the new table from packages/schemas/src/index.ts
#    Add: export * from "./db/posts"

# 3. Generate the migration SQL
bun --filter @workspace/db generate
#    Output: packages/db/migrations/0001_<name>.sql

# 4. Review the generated SQL, then apply it
bun --filter @workspace/db migrate
```

### Commands

| Command                               | What it does                                                   |
| ------------------------------------- | -------------------------------------------------------------- |
| `bun --filter @workspace/db generate` | Diff schema → create `migrations/000N_*.sql` + update snapshot |
| `bun --filter @workspace/db migrate`  | Apply all unapplied migrations to the database                 |
| `bun --filter @workspace/db studio`   | Open Drizzle Studio GUI at `https://local.drizzle.studio`      |

> Run from repo root, or `cd packages/db` and use `bun run generate`, `bun run migrate`, `bun run studio`.

### Configuration

| File                            | Role                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| `packages/schemas/src/db/*.ts`  | Drizzle table definitions (schema source of truth)                |
| `packages/db/drizzle.config.ts` | drizzle-kit config — dialect, schema paths, output dir            |
| `packages/db/src/migrate.ts`    | Migration runner — calls `drizzle-orm/migrator`                   |
| `packages/db/migrations/`       | Generated `.sql` files + `meta/_journal.json` + snapshots         |
| `packages/db/src/client.ts`     | Runtime DB client — `drizzle(postgres(DATABASE_URL), { schema })` |

### Docker

PostgreSQL runs via Docker Compose (port 5432, db/user/password all set to `template`):

```bash
docker compose up -d          # start PostgreSQL
docker compose down           # stop
docker compose down -v        # stop + delete all data (fresh start)
```

Connection string: `postgres://template:template@localhost:5432/template`

## Email Setup

Email sending is abstracted behind an `EmailSender` interface in `packages/email/src/index.ts`. Better Auth calls it for email verification and password reset emails.

### Mailpit (development)

Set `EMAIL_PROVIDER=mailpit` (the default). Emails are captured by [Mailpit](https://mailpit.axllent.org) — an SMTP catcher with a web UI. View all sent emails at **http://localhost:8025**.

Mailpit starts alongside PostgreSQL via Docker Compose. No auth or API keys needed — it accepts all SMTP traffic on port 1025.

```bash
docker compose up -d          # starts postgres + mailpit
```

To configure:

```env
EMAIL_PROVIDER=mailpit
MAILPIT_HOST=localhost         # SMTP host (default: localhost)
MAILPIT_SMTP_PORT=1025         # SMTP port (default: 1025)
EMAIL_FROM=noreply@localhost   # From address in sent emails
```

### Console (debug)

Set `EMAIL_PROVIDER=console` to log emails to stdout instead of sending:

```
[EMAIL] Verification to user@example.com: http://localhost:3001/api/auth/verify-email?token=...
[EMAIL] Reset password to user@example.com: http://localhost:5173/reset-password?token=...
```

### Resend (production)

The `createResendSender()` stub exists in `packages/email/src/index.ts`. To complete it:

1. Install the Resend SDK:

   ```bash
   cd packages/email
   bun add resend
   ```

2. Add your API key to `.env`:

   ```env
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```

3. Implement `createResendSender()` in `packages/email/src/index.ts`:

   ```ts
   import { Resend } from "resend"

   function createResendSender(): EmailSender {
     const resend = new Resend(process.env.RESEND_API_KEY)

     return {
       async sendVerificationEmail({ email, url }) {
         await resend.emails.send({
           from: process.env.EMAIL_FROM ?? "My App <noreply@mydomain.com>",
           to: email,
           subject: "Verify your email",
           html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
         })
       },
       async sendResetPasswordEmail({ email, url }) {
         await resend.emails.send({
           from: process.env.EMAIL_FROM ?? "My App <noreply@mydomain.com>",
           to: email,
           subject: "Reset your password",
           html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
         })
       },
     }
   }
   ```

4. Add `RESEND_API_KEY` to `apps/api/src/env.ts` Zod schema if you want validated env vars.

### Other providers

Swap `Resend` for any provider (SendGrid, Postmark, SES, etc.). Implement the `EmailSender` interface — two methods: `sendVerificationEmail({ email, url })` and `sendResetPasswordEmail({ email, url })`. The `packages/auth` package will call whatever you wire in.

### Environment variables for email

| Variable            | Values                                   | Default                          | Notes                                 |
| ------------------- | ---------------------------------------- | -------------------------------- | ------------------------------------- |
| `EMAIL_PROVIDER`    | `"console"` \| `"mailpit"` \| `"resend"` | `"mailpit"`                      | Selects the email sender              |
| `MAILPIT_HOST`      |                                          | `"localhost"`                    | SMTP host when using mailpit          |
| `MAILPIT_SMTP_PORT` |                                          | `1025`                           | SMTP port when using mailpit          |
| `EMAIL_FROM`        |                                          | `"noreply@localhost"`            | From address for sent emails          |
| `RESEND_API_KEY`    | `re_...`                                 | —                                | Required when `EMAIL_PROVIDER=resend` |
| `BETTER_AUTH_URL`   | URL                                      | `http://localhost:3001/api/auth` | Base URL used in email links          |

## S3 / File Storage Setup

File storage uses an S3-compatible adapter (`packages/files/src/storage.ts`). The API proxies file uploads and serves files through **floci S3** (AWS S3 in the floci account) or any other S3-compatible provider (AWS S3, GCS, Cloudflare R2, LocalStack) in other environments.

### floci S3 (default)

Set the bucket and region. For standard AWS S3, leave `S3_ENDPOINT` empty.

```env
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIAxxxxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxx
S3_BUCKET=template
# S3_BASE_URL=https://cdn.mydomain.com             # optional CDN/public URL
```

For local development against **floci** (the local AWS mock), set the endpoint:

```env
S3_ENDPOINT=http://localhost:4566
S3_REGION=us-east-1
S3_BUCKET=template
```

### AWS S3 / GCS / R2

The same `createS3Storage` adapter works with any S3-compatible provider. Set `S3_ENDPOINT` to the provider's API endpoint only when needed (omit it for standard AWS S3).

### Custom storage adapters

See `packages/files/README.md` for the `StorageProvider` interface and instructions for implementing custom adapters (GCS, Azure Blob, etc.).

### File upload endpoint

The API exposes `POST /api/files/upload` (multipart form, requires auth). The `uploadFile()` function in `packages/files/src/upload.ts` handles:

1. **Size validation** — rejects files over `maxSize` bytes.
2. **MIME type validation** — rejects disallowed types.
3. **Storage** — saves via the configured `StorageProvider`.
4. **DB record** — inserts metadata into the `file` table.

Predefined validation constants (in `packages/schemas/src/validations/files.ts`):

- `MAX_FILE_SIZE` = 10 MB | `MAX_IMAGE_SIZE` = 5 MB
- `ALLOWED_IMAGE_TYPES` — jpeg, png, webp, avif, gif
- `ALLOWED_DOCUMENT_TYPES` — pdf, txt, csv, json
- `ALLOWED_ALL_TYPES` — all of the above combined

### Environment variables for S3

| Variable               | Required | Description                                     |
| ---------------------- | -------- | ----------------------------------------------- |
| `S3_BUCKET`            | No       | S3 bucket name (default: `template`)            |
| `S3_REGION`            | No       | AWS region (default `us-east-1`)                |
| `S3_ENDPOINT`          | No       | S3-compatible endpoint (omit for standard AWS)  |
| `S3_ACCESS_KEY_ID`     | No       | Access key (uses IAM role if omitted)           |
| `S3_SECRET_ACCESS_KEY` | No       | Secret key (uses IAM role if omitted)           |
| `S3_BASE_URL`          | No       | Public base URL or CDN origin for serving files |

## Adding a new feature

### Backend route

```ts
// apps/api/src/app.ts
app.get("/api/items", async (c) => {
  const items = await db.query.items.findMany()
  return c.json({ success: true, data: items })
})
```

### Frontend query

```ts
// apps/web/src/hooks/use-items.ts
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useItems() {
  return useQuery({
    queryKey: ["items"],
    queryFn: () => apiClient<{ data: Item[] }>("/api/items"),
  })
}
```

### Database table + validation

```ts
// packages/schemas/src/db/items.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
export const item = pgTable("item", { ... })

// packages/schemas/src/validations/items.ts
import { z } from "zod"
export const createItemSchema = z.object({ ... })
```

Then add the table to `packages/schemas/src/index.ts` exports.

## Deployment

### Docker Compose (local)

All services run via Docker Compose:

```bash
# Build and start all services
docker compose up --build

# Or run in background
docker compose up --build -d

# Run migrations
docker compose exec api bun run dist/index.js

# Stop
docker compose down
```

Services:

- **web** → http://localhost:5173 (Vite static build served by `bun x serve`)
- **api** → http://localhost:3001 (Hono/Bun, compiled with `--target bun`)
- **postgres** → localhost:5432
- **mailpit** → http://localhost:8025 (SMTP on 1025, web UI on 8025)

AWS services (ECR, S3, IAM, etc.) are provided by **floci** running at `http://localhost:4566`.

### Manual build

```bash
# API
bun --filter api build

# Frontend
bun --filter web build
```

Serve the frontend from any static file server or use Hono's `serveStatic` in production.

### Environment variables

| Variable             | Required | Description                                            |
| -------------------- | -------- | ------------------------------------------------------ |
| `DATABASE_URL`       | ✅       | PostgreSQL connection string                           |
| `BETTER_AUTH_SECRET` | ✅       | 32+ char random string                                 |
| `BETTER_AUTH_URL`    | ✅       | Public URL of API server                               |
| `CLIENT_URL`         | ✅       | Frontend URL (for CORS)                                |
| `PORT`               |          | API server port (default 3001)                         |
| `LOG_LEVEL`          |          | Winston log level (default "info")                     |
| `EMAIL_PROVIDER`     |          | "console" \| "mailpit" \| "resend" (default "mailpit") |
| `VITE_API_URL`       | ✅       | API URL for frontend client                            |

## Reference docs

### Hono

- [Getting started with Bun](https://hono.dev/docs/getting-started/bun)
- [Factory helper](https://hono.dev/docs/helpers/factory) — typed middleware and app creation
- [Adapter helper](https://hono.dev/docs/helpers/adapter) — cross-runtime env + runtime detection
- [ConnInfo helper](https://hono.dev/docs/helpers/conninfo) — client remote address
- [Best practices](https://hono.dev/docs/guides/best-practices)
- [CORS middleware](https://hono.dev/docs/middleware/builtin/cors)

### Better Auth

- [Installation](https://better-auth.com/docs/installation)
- [Basic usage](https://better-auth.com/docs/basic-usage) — sign in, sign up, session
- [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Email verification](https://better-auth.com/docs/concepts/email-verification)
- [Client reference](https://better-auth.com/docs/reference/client)
- [Dynamic base URL](https://better-auth.com/docs/guides/dynamic-base-url)
- [Optimizing for performance](https://better-auth.com/docs/guides/optimizing-for-performance)

### Drizzle ORM

- [Overview](https://orm.drizzle.team/docs/overview)
- [PostgreSQL dialect](https://orm.drizzle.team/docs/get-started-postgresql)
- [Schema definitions](https://orm.drizzle.team/docs/schemas)
- [Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle Kit CLI](https://orm.drizzle.team/kit-docs/overview)

### Frontend

- [Vite](https://vite.dev/guide/)
- [React 19](https://react.dev/reference/react)
- [React Router](https://reactrouter.com/home)
- [TanStack React Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zod](https://zod.dev)
- [Zustand](https://zustand.docs.pmnd.rs/getting-started/introduction)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

### Runtime & tooling

- [Bun](https://bun.sh/docs)
- [Turborepo](https://turbo.build/repo/docs)
- [Winston](https://github.com/winstonjs/winston)
- [Docker](https://docs.docker.com)
