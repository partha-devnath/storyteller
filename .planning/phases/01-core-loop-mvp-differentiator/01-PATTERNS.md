# Phase 1: Core Loop (MVP Differentiator) - Pattern Map

**Mapped:** 2026-08-02
**Files analyzed:** 46 new/modified files classified
**Analogs found:** 44 / 46

## File Classification

| New/Modified File                                    | Role       | Data Flow        | Closest Analog                                               | Match Quality                                  |
| ---------------------------------------------------- | ---------- | ---------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| `packages/schemas/src/db/organization.ts`            | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/organization-member.ts`     | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/project.ts`                 | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/epic.ts`                    | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/card.ts`                    | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/card-version.ts`            | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/card-relation.ts`           | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/card-attachment.ts`         | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/custom-field.ts`            | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/proposal.ts`                | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/proposal-change.ts`         | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/comment.ts`                 | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | exact                                          |
| `packages/schemas/src/db/card-embedding.ts`          | model      | CRUD             | `packages/schemas/src/db/files.ts`                           | partial (pgvector column — no existing analog) |
| `packages/schemas/src/validations/org.ts`            | validation | request-response | `packages/schemas/src/validations/auth.ts`                   | exact                                          |
| `packages/schemas/src/validations/project.ts`        | validation | request-response | `packages/schemas/src/validations/auth.ts`                   | exact                                          |
| `packages/schemas/src/validations/card.ts`           | validation | request-response | `packages/schemas/src/validations/auth.ts`                   | exact                                          |
| `packages/schemas/src/validations/proposal.ts`       | validation | request-response | `packages/schemas/src/validations/auth.ts`                   | exact                                          |
| `packages/schemas/src/validations/ai.ts`             | validation | request-response | `packages/schemas/src/validations/files.ts` + `auth.ts`      | role-match                                     |
| `packages/schemas/src/index.ts` (modify)             | config     | —                | itself                                                       | exact                                          |
| `packages/schemas/src/types/api.ts` (modify)         | types      | —                | itself                                                       | exact                                          |
| `packages/schemas/src/__tests__/validations.test.ts` | test       | —                | `packages/schemas/src/__tests__/auth.test.ts`                | exact                                          |
| `packages/ai/package.json`                           | config     | —                | `packages/schemas/package.json`                              | exact                                          |
| `packages/ai/src/types.ts`                           | config     | request-response | `packages/files/src/storage.ts` (interface)                  | role-match                                     |
| `packages/ai/src/providers/openai.ts`                | provider   | request-response | `packages/files/src/storage.ts` (factory impl)               | role-match                                     |
| `packages/ai/src/providers/mock.ts`                  | provider   | request-response | `packages/email/src/index.ts` (consoleSender)                | role-match                                     |
| `packages/ai/src/providers/anthropic.ts`             | provider   | request-response | `packages/email/src/index.ts` (createResendSender)           | role-match                                     |
| `packages/ai/src/prompts/*.ts`                       | utility    | transform        | `packages/logger/src/server.ts` (module structure)           | role-match                                     |
| `packages/ai/src/operations/*.ts`                    | service    | request-response | `packages/files/src/upload.ts`                               | role-match                                     |
| `packages/ai/src/index.ts`                           | config     | —                | `packages/files/src/index.ts`                                | exact                                          |
| `packages/ai/src/__tests__/*.test.ts`                | test       | —                | `packages/files/src/__tests__/upload.test.ts`                | exact                                          |
| `packages/vector/package.json`                       | config     | —                | `packages/schemas/package.json`                              | exact                                          |
| `packages/vector/src/index.ts`                       | service    | transform        | `packages/files/src/upload.ts`                               | role-match                                     |
| `packages/vector/src/__tests__/*.test.ts`            | test       | —                | `packages/files/src/__tests__/upload.test.ts`                | exact                                          |
| `apps/api/src/env.ts` (modify)                       | config     | —                | itself                                                       | exact                                          |
| `apps/api/src/app.ts` (modify)                       | controller | request-response | itself                                                       | exact                                          |
| `apps/api/src/routes/orgs.ts`                        | controller | CRUD             | `apps/api/src/app.ts` (files routes)                         | role-match                                     |
| `apps/api/src/routes/projects.ts`                    | controller | CRUD             | `apps/api/src/app.ts` (files routes)                         | role-match                                     |
| `apps/api/src/routes/ai.ts`                          | controller | request-response | `apps/api/src/app.ts` (protected + rate limiter)             | role-match                                     |
| `apps/api/src/routes/proposals.ts`                   | controller | CRUD             | `apps/api/src/app.ts` (files routes)                         | role-match                                     |
| `apps/api/src/routes/cards.ts`                       | controller | CRUD             | `apps/api/src/app.ts` (files routes)                         | role-match                                     |
| `apps/api/src/middleware/org-scope.ts`               | middleware | request-response | `apps/api/src/app.ts` (rateLimiter middleware)               | role-match                                     |
| `apps/api/src/middleware/validate.ts`                | middleware | request-response | `apps/api/src/app.ts` (rateLimiter middleware)               | role-match                                     |
| `apps/api/src/__tests__/orgs.test.ts`                | test       | —                | `apps/api/src/__tests__/app.test.ts`                         | exact                                          |
| `packages/auth/src/server.ts` (modify)               | config     | event-driven     | itself                                                       | exact                                          |
| `apps/web/src/App.tsx` (modify)                      | component  | —                | itself                                                       | exact                                          |
| `apps/web/src/routes/landing.tsx`                    | component  | request-response | `apps/web/src/routes/signup.tsx` (page structure)            | role-match                                     |
| `apps/web/src/routes/projects.tsx`                   | component  | CRUD             | `apps/web/src/routes/dashboard.tsx`                          | exact                                          |
| `apps/web/src/routes/project-board.tsx`              | component  | CRUD             | `apps/web/src/routes/dashboard.tsx`                          | exact                                          |
| `apps/web/src/routes/project-chat.tsx`               | component  | request-response | `apps/web/src/routes/signup.tsx` (form pattern)              | role-match                                     |
| `apps/web/src/components/app-shell.tsx`              | component  | —                | `apps/web/src/routes/dashboard.tsx` (layout)                 | role-match                                     |
| `apps/web/src/components/board-column.tsx`           | component  | —                | `packages/ui/src/components/card.tsx` (shadcn)               | role-match                                     |
| `apps/web/src/components/card-drawer.tsx`            | component  | —                | `packages/ui/src/components/card.tsx` (shadcn)               | role-match                                     |
| `apps/web/src/hooks/use-orgs.ts`                     | hook       | CRUD             | `apps/web/src/hooks/use-user.ts`                             | exact                                          |
| `apps/web/src/hooks/use-projects.ts`                 | hook       | CRUD             | `apps/web/src/hooks/use-user.ts`                             | exact                                          |
| `apps/web/src/hooks/use-cards.ts`                    | hook       | CRUD             | `apps/web/src/hooks/use-user.ts`                             | exact                                          |
| `apps/web/src/hooks/use-proposals.ts`                | hook       | CRUD             | `apps/web/src/hooks/use-user.ts`                             | exact                                          |
| `apps/web/src/hooks/use-ai.ts`                       | hook       | request-response | `apps/web/src/hooks/use-user.ts`                             | exact                                          |
| `apps/web/src/stores/board-store.ts`                 | store      | —                | `apps/web/src/stores/app-store.ts`                           | exact                                          |
| `apps/web/src/components/__tests__/*.test.tsx`       | test       | —                | `apps/web/src/components/__tests__/protected-route.test.tsx` | exact                                          |
| `apps/e2e/src/seed.ts` (modify)                      | test-util  | —                | itself                                                       | exact                                          |
| `apps/e2e/src/core-loop.test.ts`                     | test       | —                | `apps/e2e/src/smoke.test.ts`                                 | exact                                          |

## Pattern Assignments

### Group A: Drizzle table definitions (13 new tables)

**Analog:** `packages/schemas/src/db/files.ts` (full file, 17 lines)

**Core pattern** (lines 1-17) — every new table copies this shape exactly:

```typescript
import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { user } from "./users"

export const file = pgTable("file", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  ...
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

**Rules for the 13 new tables:**

- **Named exports** only (`export const organization = pgTable("organization", {...})`).
- **Column naming**: camelCase property → snake_case column name (e.g. `projectId: text("project_id")`).
- **FK pattern**: `references(() => org.id, { onDelete: "cascade" })` — see `files.ts:6-8` and `sessions.ts:12-14`. `organization_member.org_id` should reference `organization.id`; `card.project_id` → `project.id`; `proposal.created_by` → `user.id`.
- **No enums** (`erasableSyntaxOnly`): use `text(...)` + TS union type, e.g. role: `text("role").notNull().$type<"owner" | "admin" | "member" | "viewer">()`, matching the constants style of `packages/schemas/src/validations/files.ts:3-9`. Prefer a `z.enum` in validations; `$type` keeps the column plain text in PG.
- **JSON columns** (acceptance_criteria, custom_fields, config, new_data, relation_summary, conflict_flags, mentions, columns): `json("acceptance_criteria").$type<string[]>()` from `drizzle-orm/pg-core`.
- **The card table** is the largest — unique slug on `(project_id, slug)` via `.unique()`, `isClosed: boolean("is_closed").notNull().default(false)`.
- **card_embedding.ts** has NO analog for the vector column — see No Analog Found. It needs `vector("embedding")` from `drizzle-orm/pgvector-core` (verify against RESEARCH.md; drizzle-kit will emit the extension in migration).

**Index re-export** — `packages/schemas/src/index.ts` (lines 1-8): add one line per new table + validation file:

```typescript
export * from "./db/users"
export * from "./db/files"
export * from "./db/organization"
// ... one line per new table ...
export * from "./validations/auth"
export * from "./validations/org"
// ...
```

### Group B: Zod validation schemas (5 new files)

**Analog:** `packages/schemas/src/validations/auth.ts` (full file, 48 lines)

**Core pattern** (lines 1-6, 45-48):

```typescript
import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export type LoginInput = z.infer<typeof loginSchema>
```

**Conventions:**

- **Named exports**: `export const createProjectSchema = z.object({...})`, then `export type CreateProjectInput = z.infer<typeof createProjectSchema>`.
- **Cross-field validation**: `.refine()` with `path` (see `auth.ts:20-23`).
- **Enums**: `z.enum(["owner", "admin", "member", "viewer"])` — see `files.ts:30` (`z.enum(["avatar", "attachment", "document"])`).
- **Constants for allowed sets**: `export const CARD_STATUSES = [...] as const` — see `files.ts:3-9` (`ALLOWED_IMAGE_TYPES`).
- **ai.ts**: strict schemas for AI JSON output — `z.object({...}).strict()`; reject malformed output at the boundary. Type exports: `export type GenerateBoardOutput = z.infer<typeof generateBoardSchema>`.

### Group C: Package scaffolding — `@workspace/ai` and `@workspace/vector`

**Analog (package.json):** `packages/schemas/package.json` (full file)

**Exports map** (lines 1-12): `main: "./src/index.ts"`, subpath exports for `./providers/*`, `./prompts/*`, `./operations/*` mirroring the schemas pattern (`"./validations/*": "./src/validations/*.ts"`).

**Analog (barrel):** `packages/files/src/index.ts` (lines 1-5):

```typescript
export { createS3Storage } from "./storage"
export type { StorageProvider, StoredFile, S3Options } from "./storage"
export { uploadFile } from "./upload"
export type { UploadResult, UploadOptions } from "./upload"
```

New packages use the same barrel: export impls + types, **no default exports**.

**Analog (provider interface):** `packages/files/src/storage.ts` (lines 8-13) — `LLMProvider` is modeled on `StorageProvider`:

```typescript
export interface StorageProvider {
  save(file: File, storedName: string): Promise<StoredFile>
  delete(storedName: string): Promise<void>
  ...
}
```

**Analog (provider selection by env var):** `packages/email/src/index.ts` (lines 81-88):

```typescript
const provider = process.env.EMAIL_PROVIDER

export const emailSender: EmailSender =
  provider === "resend"
    ? createResendSender()
    : provider === "mailpit"
      ? createMailpitSender()
      : consoleSender
```

`@workspace/ai` mirrors this: `AI_PROVIDER === "mock" ? createMockProvider() : createOpenAIProvider()`. SDKs imported dynamically (`await import(...)`) — see `email/index.ts:59` and `storage.ts:61`.

**Mock provider** = deterministic, no network (analog: `consoleSender` in `email/index.ts:13-20`). Must return **valid Zod-conforming JSON** so it exercises the full validation path.

**Analog (service module):** `packages/files/src/upload.ts` (lines 28-78) — used by `operations/*.ts` and `vector/*.ts`:

```typescript
import { db } from "@workspace/db"
import { file as fileSchema } from "@workspace/schemas"
import { createLogger } from "@workspace/logger"

const logger = createLogger("files")

export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  // 1. validate inputs -> throw new Error(...) on failure (lines 31-48)
  // 2. side-effect call (storage.save) (line 51)
  // 3. db insert().returning() (lines 53-67)
  // 4. logger.info({...}, "File uploaded") (line 69)
}
```

AI operations follow this: validate → call provider.chat() → parse + Zod-validate → build proposal objects → return (they do NOT write to DB — see CONTEXT decision; the route layer persists).

### Group D: API routes + middleware

**Analog:** `apps/api/src/app.ts` (full file, 257 lines). New route files copy the per-route handler patterns.

**Imports & factory** (lines 1-18):

```typescript
import { createFactory, createMiddleware } from "hono/factory"
import { eq, sql } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { createLogger } from "@workspace/logger"
import { db } from "@workspace/db"

type Env = { Variables: { requestId: string } }
const factory = createFactory<Env>()
const logger = createLogger("api")
```

**Auth/session guard** (lines 161-167) — every org-scoped route:

```typescript
const session = await auth.api.getSession({ headers: c.req.raw.headers })
if (!session) {
  return c.json({ success: false, error: "Unauthorized" }, 401)
}
```

**CRUD read + 404** (lines 214-225):

```typescript
const id = c.req.param("id")
const [record] = await db
  .select()
  .from(fileSchema)
  .where(eq(fileSchema.id, id))
  .limit(1)
if (!record) {
  return c.json({ success: false, error: "File not found" }, 404)
}
return c.json({ success: true, data: record })
```

**Ownership → 403** (lines 243-245):

```typescript
if (record.userId !== session.user.id) {
  return c.json({ success: false, error: "Forbidden" }, 403)
}
```

**Rate limiter** (lines 75-105) — AI routes use this (maxRequests, windowMs):

```typescript
function rateLimiter(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    const info = getConnInfo(c)
    const key = info.remote.address ?? "unknown"
    ...
    return c.json({ success: false, error: "Too many requests" }, 429)
  })
}
// + setInterval cleanup with .unref() (lines 98-105)
```

**Route registration** (lines 135-137): `app.use("/api/ai/*", rateLimiter(10, 60_000))` then `app.on(...)` / `app.get(...)` / `app.post(...)`.

**Response envelope**: always `c.json({ success: true, data: ... })` / `{ success: false, error: msg }` — matches `packages/schemas/src/types/api.ts` (`ApiResponse<T>`).

**Middleware (org-scope.ts, validate.ts)** — modeled on the rateLimiter factory (`app.ts:75-96`): export `function requireOrg() { return createMiddleware(async (c, next) => {...}) }`. Flow per CONTEXT: authenticated → session → org membership (join `organization_member` on `org_id` + `user_id`) → role → 403. Validate middleware: `zodSchema.safeParse(body)` → `{ success: false, error }` 400 on failure.

**Response validation**: use Zod schemas from `@workspace/schemas/validations/*` (not inline z objects).

### Group E: `apps/api/src/env.ts` (modify)

**Analog:** itself. Add AI vars to the schema (lines 3-23), mirroring the S3 block:

```typescript
AI_PROVIDER: z.enum(["openai", "anthropic", "mock"]).default("mock"),
OPENAI_API_KEY: z.string().optional(),
ANTHROPIC_API_KEY: z.string().optional(),
EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
CHAT_MODEL: z.string().default("gpt-4o-mini"),
```

### Group F: `packages/auth/src/server.ts` (modify)

**Analog:** itself (full file). Personal-org-on-signup uses Better Auth's `databaseHooks` (or organization plugin) inside the existing `betterAuth({...})` config (lines 10-64). Keep the existing drizzleAdapter schema map (lines 13-21) — org tables are NOT Better Auth tables, but `organization_member` will be queried via `@workspace/db` directly in org-scope middleware.

### Group G: Frontend — hooks, stores, routes, components

**Analog (React Query hook):** `apps/web/src/hooks/use-user.ts` (full file, 15 lines):

```typescript
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => apiClient<ProtectedResponse>("/api/protected"),
    retry: false,
  })
}
```

New hooks (`use-orgs`, `use-projects`, `use-cards`, `use-proposals`, `use-ai`) copy this; mutations use `useMutation` from the same package. Query keys: `["orgs"]`, `["projects", orgId]`, `["cards", projectSlug]`, `["proposals", projectId]`, `["ai", projectSlug]`.

**Analog (store):** `apps/web/src/stores/app-store.ts` (full file, 11 lines) — Zustand `create<T>((set) => ...)` with named export `useBoardStore`.

**Analog (form page):** `apps/web/src/routes/signup.tsx` (lines 27-53) — React Hook Form + `zodResolver(schema)` + shadcn `Card`/`Input`/`Label`/`Button`, `form.handleSubmit(onSubmit)`, error text per field, `setError` for server errors. `project-chat.tsx` (AI prompt form) uses this pattern with `useMutation` instead of direct fetch.

**Analog (page layout):** `apps/web/src/routes/dashboard.tsx` (lines 13-27) — shadcn `Button` + Tailwind v4 utilities; app-shell extends this with collapsible sidebar (state via `useAppStore` pattern).

**Analog (route guard):** `apps/web/src/components/protected-route.tsx` (lines 4-20) — new `/projects` routes nest under `<Route element={<ProtectedRoute />}>`.

**Route wiring (App.tsx modify)** — pattern at `apps/web/src/App.tsx` lines 12-26: add `/` → `LandingPage` (public, no guard), `/projects` and `/projects/:slug/*` under `ProtectedRoute`. Card deep link `/project/:slug/card/:cardSlug` per CONTEXT specifics.

**UI components**: install from shadcn via `bun --filter @workspace/ui add <component>` (never build from scratch) — see `packages/ui/src/components/button.tsx` for the shadcn output shape (named exports, cva, `@workspace/ui/lib/utils` `cn`).

### Group H: Tests

**Analog (package unit tests, Vitest):** `packages/schemas/src/__tests__/auth.test.ts` (lines 1-13):

```typescript
import { describe, it, expect } from "vitest"
import { loginSchema, signupSchema } from "../validations/auth"

describe("auth validations", () => {
  it("validates signup with valid data", () => {
    const result = signupSchema.safeParse({ ... })
    expect(result.success).toBe(true)
  })
})
```

**Analog (service tests with mocks):** `packages/files/src/__tests__/upload.test.ts` (lines 3-22) — `vi.hoisted()` + `vi.mock("@workspace/db", ...)` + `vi.mock("@workspace/logger", ...)`. AI/vector service tests copy this exactly (mock db + logger, dynamic `await import("../upload")`).

**Analog (API tests, bun:test):** `apps/api/src/__tests__/app.test.ts` (lines 1-33):

```typescript
import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  ...
})

it("health endpoint returns ok", async () => {
  const appModule = await import("../app")
  const app = appModule.default
  const req = new Request("http://localhost/api/health")
  const res = await app.fetch(req)
  expect(res.status).toBe(200)
})
```

Cross-org isolation tests live here (User A cannot read User B's data — CONTEXT testing decision).

**Analog (component tests):** `apps/web/src/components/__tests__/protected-route.test.tsx` (lines 1-18) — `vi.mock("@/lib/auth-client", ...)` + `MemoryRouter` wrapper + Testing Library `render/screen`.

### Group I: E2E (Playwright)

**Analog (journey test):** `apps/e2e/src/smoke.test.ts` (lines 31-40) — sign-in journey with seeded user:

```typescript
test("signs in with seeded user and redirects to dashboard", async ({ page }) => {
  await page.goto("/")
  await page.getByLabel("Email").fill(TEST_USER.email)
  ...
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL("/dashboard", { timeout: 10_000 })
})
```

**Analog (seed):** `apps/e2e/src/seed.ts` (full file) — extend to insert org + project + proposal data with `db.insert(...)` from `@workspace/db`. E2E runs with `AI_PROVIDER=mock` (deterministic — no live calls).

**Infra to reuse as-is:** `global-setup.ts` (create test DB → `runMigrations()` → seed), `global-teardown.ts`, `db.ts` (test DB derivation/drop), `playwright.config.ts` (webServer for web+api). No changes expected except possibly env for mock provider.

---

## Shared Patterns

### Session/Auth Guard (all API routes)

**Source:** `apps/api/src/app.ts:161-167`
**Apply to:** All route files under `/api/orgs`, `/api/projects`, `/api/ai`, `/api/proposals`, `/api/cards`

```typescript
const session = await auth.api.getSession({ headers: c.req.raw.headers })
if (!session) {
  return c.json({ success: false, error: "Unauthorized" }, 401)
}
```

### Org-Scoping (all org-scoped routes, enforced via middleware)

**Source:** `apps/api/src/app.ts:75-96` (createMiddleware factory pattern) + session guard above
**Apply to:** All new route files except auth routes. Flow: session → look up `organization_member` by `(org_id, user_id)` → attach role to context → role check per route (viewer = read-only) → 403 otherwise.

### Central Error Handling

**Source:** `apps/api/src/app.ts:107-129`
**Apply to:** app.ts (already present; keep as the last `app.use`). New route files throw/return inside try-catch and let this middleware normalize. Follow the existing convention: never leak `500` message bodies (`status === 500 ? "Internal Server Error" : message`).

### Rate Limiting (AI + auth endpoints)

**Source:** `apps/api/src/app.ts:75-105` — reuse the in-memory `rateLimiter(maxRequests, windowMs)` (already exported in app.ts scope). Apply to `/api/ai/*` (e.g., 10/60s) and keep `/api/auth/*` (30/60s, line 135).

### Validation (all request bodies)

**Source:** `packages/schemas/src/validations/auth.ts` + `packages/schemas/src/validations/files.ts`
**Apply to:** New route handlers via `validate.ts` middleware — Zod schemas from `@workspace/schemas/validations/*`, `.safeParse()` → 400 `{ success: false, error }`. Reuse schema types as TS types.

### Response Envelope

**Source:** `packages/schemas/src/types/api.ts:1-11` (`ApiResponse<T>`, `PaginatedResponse<T>`)
**Apply to:** Every API response — `{ success: true, data }` or `{ success: false, error }`.

### Drizzle Query/Write Pattern

**Source:** `packages/files/src/upload.ts:53-67` (insert + returning), `apps/api/src/app.ts:201-225` (select + where + limit + 404)
**Apply to:** All routes and services. No raw SQL (AGENTS.md).

### Logging

**Source:** `packages/logger/src/server.ts:30-57` — `createLogger("module-name")` with `logger.info/warn/error/debug`.
**Apply to:** Every new package module and route file.

### Frontend Data Fetching

**Source:** `apps/web/src/lib/api-client.ts` (full file, credentials: "include", throws on !ok) + `apps/web/src/hooks/use-user.ts`
**Apply to:** All new hooks/views. Server state via TanStack Query; forms via RHF + zodResolver; UI via shadcn from `@workspace/ui`.

## No Analog Found

| File                                        | Role      | Data Flow        | Reason / Guidance                                                                                                                                                                                |
| ------------------------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/schemas/src/db/card-embedding.ts` | model     | CRUD             | No pgvector column exists in the repo yet. Use `drizzle-orm/pgvector-core` (`vector("embedding")`) — verify exact import + drizzle-kit migration output against RESEARCH.md before implementing. |
| `packages/ai/src/prompts/*.ts`              | utility   | transform        | No prompt-builder analog. Copy the module style of `packages/logger/src/server.ts` (named export + `createLogger`), but prompt composition is new.                                               |
| `apps/web/src/routes/landing.tsx`           | component | request-response | No marketing/landing page exists (21st.dev-inspired, adapted to shadcn + Tailwind v4). Reuse `Card`/`Button` from `packages/ui`, dark-mode via `ThemeProvider`.                                  |
| Kanban board drag-drop                      | component | CRUD             | No dnd library or board analog in repo. Planner must pick a library (RESEARCH.md) and wrap with shadcn `Card`.                                                                                   |
| Card version diff view                      | component | —                | No diff-viewer analog. Backend can compute unified diff (service), frontend renders it.                                                                                                          |

## Metadata

**Analog search scope:** `packages/schemas/src/`, `packages/{auth,db,files,email,logger,ui}/src/`, `apps/api/src/`, `apps/web/src/`, `apps/e2e/src/`, root + package `package.json`s, `packages/db/drizzle.config.ts`
**Files scanned:** ~60 (read in full or targeted sections)
**Pattern extraction date:** 2026-08-02

### Key conventions enforced by analogs (from AGENTS.md + codebase)

- Named exports only; **no default exports** (barrels + hooks + tables)
- `type` imports preferred (`import { type ReactNode }`, `import type { StorageProvider }`)
- `erasableSyntaxOnly` → no enums/namespaces; unions via `as const`/`z.enum`/`$type`
- `@workspace/*` alias imports everywhere (never relative for cross-package)
- Bun APIs in API app (`Bun.serve`, `Bun.password`); Vitest in packages/web, `bun:test` in apps/api
- Drizzle migrations: add tables → re-export from index.ts → `bun --filter @workspace/db generate` → `migrate` (drizzle.config globs `node_modules/@workspace/schemas/src/db/*.ts`, so new tables are auto-discovered)
