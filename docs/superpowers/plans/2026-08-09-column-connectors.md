# GitHub/Trello Column Connectors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage board columns (add/rename/delete, Backlog+Review locked) and connect a column to GitHub or Trello: cards entering a connected column get published once as an external ticket, and the app shows the ticket's live state and comments.

**Architecture:** Schema additions (credential table, card external links, widened status types) underpin a credential service (AES-256-GCM), provider clients (GitHub/Trello over fetch), and an event-bus subscriber (`subscribeAll`) that publishes on card entry. REST endpoints handle column CRUD, connect/disconnect, Trello lookup proxies, and external ticket fetch. React Query hooks drive the settings UI and the drawer's external section.

**Tech Stack:** Hono, Drizzle ORM, zod, node:crypto, React 19, React Query, Vitest, bun:test.

## Global Constraints

- Named exports only — no default exports
- No comments in code unless asked
- Conventional Commits; run `bun run typecheck` + `bun run lint` before committing
- Tests in `__tests__/` next to source; web via root vitest, api via `bun test` in `apps/api`
- Types must be erasable (no enums)
- Server-side validation only in `@workspace/schemas` zod schemas
- API test DB: `postgres://template:template@localhost:5432/template` (docker); seed with `test_integ_*` IDs, delete in afterAll
- Provider HTTP calls are ALWAYS mocked in tests (never hit GitHub/Trello)
- `INTEGRATION_SECRET` env var: required at credential use; add to `apps/api/.env`, `.env.example`, and docker-compose api env

---

### Task 1: Schema layer — credential table, external links, status widening, column validation

**Files:**

- Create: `packages/schemas/src/db/integration-credential.ts`
- Modify: `packages/schemas/src/db/card.ts`, `packages/schemas/src/db/card-version.ts`, `packages/schemas/src/db/project.ts`, `packages/schemas/src/index.ts`, `packages/schemas/src/validations/project.ts`
- Modify: `packages/schemas/src/__tests__/validations.test.ts`
- Migration: `bun --filter @workspace/db generate` + apply via `DATABASE_URL=... bun --filter @workspace/db migrate`

**Interfaces:**

- Consumes: existing project/card tables
- Produces:
  - `integrationCredential` table + `IntegrationCredential` type (Tasks 2-5)
  - `card.external_links: ExternalLink[]` column (Tasks 4-7)
  - `ProjectColumn` extended with `locked?` + `integration?` (Tasks 4-6)
  - `card.status`/`cardVersion.status` widened to `string` (custom columns)
  - `updateProjectColumnsSchema` (Task 4)

- [ ] **Step 1: Write the failing schema tests**

Append to `packages/schemas/src/__tests__/validations.test.ts`:

```ts
import { updateProjectColumnsSchema } from "../validations/project"

describe("project columns validations", () => {
  const locked = [
    { key: "backlog", title: "Backlog", locked: true },
    { key: "review", title: "Review", locked: true },
  ]
  const custom = [{ key: "qa", title: "QA", locked: false, integration: null }]

  it("accepts locked columns plus custom columns", () => {
    const result = updateProjectColumnsSchema.safeParse({
      columns: [...locked, ...custom],
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing locked columns", () => {
    const result = updateProjectColumnsSchema.safeParse({ columns: custom })
    expect(result.success).toBe(false)
  })

  it("rejects a changed locked column", () => {
    const result = updateProjectColumnsSchema.safeParse({
      columns: [
        { key: "backlog", title: "Backlog renamed", locked: true },
        { key: "review", title: "Review", locked: true },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects duplicate keys", () => {
    const result = updateProjectColumnsSchema.safeParse({
      columns: [
        ...locked,
        { key: "qa", title: "QA", locked: false },
        { key: "qa", title: "QA2", locked: false },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects more than 12 columns", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      key: `col${i}`,
      title: `Col ${i}`,
      locked: false,
    }))
    const result = updateProjectColumnsSchema.safeParse({
      columns: [...locked, ...many],
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test validations`
Expected: FAIL — `updateProjectColumnsSchema` missing.

- [ ] **Step 3: Implement the schema**

Create `packages/schemas/src/db/integration-credential.ts`:

```ts
import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { project } from "./project"

export const integrationCredential = pgTable("integration_credential", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  provider: text("provider").$type<"github" | "trello">().notNull(),
  config: json("config").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

Extend `packages/schemas/src/db/card.ts` — add the column + widen status:

```ts
    status: text("status").$type<string>().notNull(),
```

(above stays in place; change the `$type` union to `string`)

Add after `sections`:

```ts
    externalLinks: json("external_links")
      .$type<ExternalLink[]>()
      .notNull()
      .default([]),
```

Add the type export at the top of card.ts (after imports):

```ts
export type ExternalLink = {
  id: string
  type: "github" | "trello"
  externalId: string
  url: string
  columnKey: string
  credentialId: string
  createdAt: string
}
```

Widen `packages/schemas/src/db/card-version.ts` status `$type` to `string` (line 24-26, drop the union).

Extend `packages/schemas/src/db/project.ts` — `ProjectColumn`:

```ts
export type ProjectColumn = {
  key: string
  title: string
  locked?: boolean
  integration?: {
    type: "github" | "trello"
    credentialId: string
    target: string
    boardName?: string
    listName?: string
  } | null
}
```

Add export to `packages/schemas/src/index.ts` (line 8 area):

```ts
export * from "./db/integration-credential"
```

Append to `packages/schemas/src/validations/project.ts`:

```ts
export const updateProjectColumnsSchema = z.object({
  columns: z
    .array(
      z.object({
        key: z
          .string()
          .regex(
            /^[a-z][a-zA-Z0-9_]*$/,
            "Column key must be lowercase snake or camelCase"
          ),
        title: z
          .string()
          .min(1, "Column title is required")
          .max(60, "Column title must be at most 60 characters"),
        locked: z.boolean().optional(),
        integration: z
          .object({
            type: z.enum(["github", "trello"]),
            credentialId: z.string().min(1),
            target: z.string().min(1),
            boardName: z.string().optional(),
            listName: z.string().optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .max(12, "At most 12 columns are allowed")
    .superRefine((columns, ctx) => {
      const seen = new Set<string>()
      for (const [i, col] of columns.entries()) {
        if (seen.has(col.key)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "key"],
            message: `Duplicate column key: ${col.key}`,
          })
        }
        seen.add(col.key)
        if (col.key !== "backlog" && col.key !== "review" && col.locked) {
          ctx.addIssue({
            code: "custom",
            path: [i, "locked"],
            message: "Only backlog and review can be locked",
          })
        }
      }
      for (const [i, expected] of [
        { key: "backlog", title: "Backlog" },
        { key: "review", title: "Review" },
      ].entries()) {
        const actual = columns[i]
        if (
          !actual ||
          actual.key !== expected.key ||
          actual.title !== expected.title ||
          actual.locked !== true
        ) {
          ctx.addIssue({
            code: "custom",
            path: [i],
            message: `System column "${expected.key}" must be present unchanged at position ${i}`,
          })
        }
      }
    }),
})
```

- [ ] **Step 4: Run tests + generate migration**

Run: `bun run test validations` — PASS (5 new tests).

Run: `bun --filter @workspace/db generate` — migration file created (verify SQL only touches card/external_links + integration_credential + card_version snapshot; no status ALTER needed since column is already text).

Run: `DATABASE_URL="postgres://template:template@localhost:5432/template" bun --filter @workspace/db migrate` — applied.

- [ ] **Step 5: Verify + commit**

Run: `bun run typecheck` and `bun run lint` — clean (fix any status-union fallout in apps/web/apps/api: casts like `as typeof card.$inferSelect.status` still compile since string widens).

```bash
git add packages/schemas/src/db/integration-credential.ts packages/schemas/src/db/card.ts packages/schemas/src/db/card-version.ts packages/schemas/src/db/project.ts packages/schemas/src/index.ts packages/schemas/src/validations/project.ts packages/schemas/src/__tests__/validations.test.ts packages/db/migrations
git commit -m "feat(schemas): integration credentials, external links, and column validation"
```

---

### Task 2: Credential encryption service

**Files:**

- Create: `apps/api/src/services/credential-crypto.ts`
- Modify: `.env.example`, `apps/api/.env`, `docker-compose.yml` (INTEGRATION_SECRET)

**Interfaces:**

- Consumes: `INTEGRATION_SECRET` env
- Produces: `encryptConfig(plain: Record<string, string>): Record<string, string>` (returns `{ iv, tag, data }`), `decryptConfig(stored: Record<string, string>): Record<string, string>` — Task 3's subscriber uses decryptConfig; Task 4's connect endpoint uses encryptConfig

- [ ] **Step 1: Implement credential-crypto.ts**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

function secretKey(): Buffer {
  const secret = process.env.INTEGRATION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      "INTEGRATION_SECRET environment variable is required (min 16 chars)"
    )
  }
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32))
}

export function encryptConfig(
  plain: Record<string, string>
): Record<string, string> {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv)
  const data = Buffer.concat([
    cipher.update(JSON.stringify(plain), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  }
}

export function decryptConfig(
  stored: Record<string, string>
): Record<string, string> {
  if (!stored.iv || !stored.data) {
    throw new Error("Invalid stored credential config")
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    secretKey(),
    Buffer.from(stored.iv, "base64")
  )
  if (stored.tag) {
    decipher.setAuthTag(Buffer.from(stored.tag, "base64"))
  }
  const data = Buffer.concat([
    decipher.update(Buffer.from(stored.data, "base64")),
    decipher.final(),
  ])
  return JSON.parse(data.toString("utf8")) as Record<string, string>
}
```

- [ ] **Step 2: Add INTEGRATION_SECRET to env files**

- `.env.example`: add `INTEGRATION_SECRET=change-me-to-a-random-string-at-least-16-chars`
- `apps/api/.env`: add a real random value (e.g. `openssl rand -hex 16`)
- `docker-compose.yml` api environment: add `INTEGRATION_SECRET: change-me-to-a-random-string-at-least-16-chars`

- [ ] **Step 3: Verify + commit**

Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add apps/api/src/services/credential-crypto.ts .env.example apps/api/.env docker-compose.yml
git commit -m "feat(api): encrypt integration credentials at rest"
```

---

### Task 3: event-bus global subscription + publish-on-entry service

**Files:**

- Modify: `apps/api/src/services/event-bus.ts`
- Create: `apps/api/src/services/column-integration.ts`
- Create: `apps/api/src/services/providers.ts`
- Create: `apps/api/src/__tests__/column-integration.test.ts`
- Modify: `apps/api/src/app.ts` (register subscriber)

**Interfaces:**

- Consumes: `subscribeAll` (new), `project`, `card`, `integrationCredential` tables; `ExternalLink` type; `encryptConfig`/`decryptConfig` (Task 2)
- Produces:
  - `subscribeAll(handler: (projectId: string, event: ProjectEvent) => void): () => void`
  - `registerColumnIntegrationSubscriber(providers?)` — call once at startup
  - `publishCardToColumn({ projectId, cardId, status, providers? })`
  - provider clients (`realProviders`, `ProviderClients` type) — consumed by Tasks 4-5

This is a brand-new service with no prior behavior, so there is no red phase: write implementation + tests together, then run.

- [ ] **Step 1: Implement `subscribeAll` in event-bus.ts**

```ts
const globalSubscribers = new Set<
  (projectId: string, event: ProjectEvent) => void
>()

export function subscribeAll(
  handler: (projectId: string, event: ProjectEvent) => void
): () => void {
  globalSubscribers.add(handler)
  return () => {
    globalSubscribers.delete(handler)
  }
}
```

In `publish`, after the per-project loop:

```ts
for (const handler of globalSubscribers) {
  try {
    handler(projectId, event)
  } catch (error) {
    logger.error(
      { projectId, eventType: event.type, error },
      "event-bus: global subscriber failed"
    )
  }
}
```

- [ ] **Step 2: Implement `providers.ts` + `column-integration.ts`**

Create `apps/api/src/services/providers.ts` — see the full `ProviderClients` type + `realProviders` implementation in the plan appendix below (Step 3 code). Copy verbatim.

Create `apps/api/src/services/column-integration.ts`:

```ts
import { db } from "@workspace/db"
import { card, project, integrationCredential } from "@workspace/schemas"
import { subscribeAll } from "./event-bus"
import { realProviders, type ProviderClients } from "./providers"
import { decryptConfig } from "./credential-crypto"
import { createLogger } from "@workspace/logger"
import { httpError } from "../middleware/org-scope"

const logger = createLogger("api")

export function registerColumnIntegrationSubscriber(
  providers: ProviderClients = realProviders
): () => void {
  return subscribeAll(async (projectId, event) => {
    if (event.type !== "card.updated") return
    try {
      await publishCardToColumn({
        projectId,
        cardId: event.card.id,
        status: event.card.status,
        providers,
      })
    } catch (error) {
      logger.warn(
        { projectId, cardId: event.card.id, error },
        "column integration: publish failed"
      )
    }
  })
}

export function assertConnectableColumn(
  columns: { key: string; locked?: boolean }[],
  key: string
): { key: string; locked?: boolean } {
  const column = columns.find((c) => c.key === key)
  if (!column) throw httpError("Column not found", 404)
  if (column.locked) throw httpError("System columns cannot be connected", 400)
  return column
}

export async function storeCredential(params: {
  projectId: string
  provider: "github" | "trello"
  config: Record<string, string>
}): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(integrationCredential).values({
    id,
    projectId: params.projectId,
    provider: params.provider,
    config: encryptConfig(params.config),
  })
  return id
}

export async function publishCardToColumn({
  projectId,
  cardId,
  status,
  providers = realProviders,
}: {
  projectId: string
  cardId: string
  status: string
  providers?: ProviderClients
}): Promise<void> {
  const [proj] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  if (!proj) return

  const column = proj.columns.find((c) => c.key === status)
  if (!column?.integration) return

  const [cred] = await db
    .select()
    .from(integrationCredential)
    .where(eq(integrationCredential.id, column.integration.credentialId))
    .limit(1)
  if (!cred) return

  const [cardRow] = await db
    .select()
    .from(card)
    .where(eq(card.id, cardId))
    .limit(1)
  if (!cardRow) return

  const existing = cardRow.externalLinks.some(
    (l) => l.columnKey === status && l.type === cred.provider
  )
  if (existing) return

  const config = decryptConfig(cred.config)
  const body = [
    cardRow.description ?? "",
    "",
    "Acceptance criteria:",
    ...cardRow.acceptanceCriteria.map((c) => `- ${c}`),
  ].join("\n")

  let externalId: string
  let url: string
  if (cred.provider === "github") {
    const created = await providers.github.createIssue({
      token: config.token,
      repo: column.integration.target,
      title: cardRow.title,
      body,
    })
    externalId = created.externalId
    url = created.url
  } else {
    const created = await providers.trello.createCard({
      apiKey: config.apiKey,
      token: config.token,
      idList: column.integration.target,
      name: cardRow.title,
      desc: body,
    })
    externalId = created.externalId
    url = created.url
  }

  await db
    .update(card)
    .set({
      externalLinks: [
        ...cardRow.externalLinks,
        {
          id: crypto.randomUUID(),
          type: cred.provider,
          externalId,
          url,
          columnKey: status,
          credentialId: cred.id,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date(),
    })
    .where(eq(card.id, cardId))
}
```

(Add `encryptConfig` to the credential-crypto import — it is used by `storeCredential`.)

- [ ] **Step 3: Provider clients**

Append to `providers.ts` — the full `ProviderClients` type + `realProviders` implementation:

```ts
export type ProviderClients = {
  github: {
    createIssue: (p: {
      token: string
      repo: string
      title: string
      body: string
    }) => Promise<{ externalId: string; url: string }>
    fetchIssue: (p: {
      token: string
      repo: string
      issueNumber: string
    }) => Promise<{
      state: string
      url: string
      comments: { author: string; text: string; createdAt: string }[]
    }>
    fetchRepo: (p: { token: string; repo: string }) => Promise<void>
  }
  trello: {
    createCard: (p: {
      apiKey: string
      token: string
      idList: string
      name: string
      desc: string
    }) => Promise<{ externalId: string; url: string }>
    fetchCard: (p: {
      apiKey: string
      token: string
      cardId: string
    }) => Promise<{
      state: string
      url: string
      comments: { author: string; text: string; createdAt: string }[]
    }>
    fetchBoards: (p: {
      apiKey: string
      token: string
    }) => Promise<{ id: string; name: string }[]>
    fetchLists: (p: {
      apiKey: string
      token: string
      boardId: string
    }) => Promise<{ id: string; name: string }[]>
    fetchList: (p: {
      apiKey: string
      token: string
      listId: string
    }) => Promise<void>
  }
}

export const realProviders: ProviderClients = {
  github: {
    async createIssue({ token, repo, title, body }) {
      const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "user-agent": "storyteller",
        },
        body: JSON.stringify({ title, body }),
      })
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
      const data = (await res.json()) as { number: number; html_url: string }
      return { externalId: String(data.number), url: data.html_url }
    },
    async fetchIssue({ token, repo, issueNumber }) {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "user-agent": "storyteller",
          },
        }
      )
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
      const data = (await res.json()) as { state: string; html_url: string }
      const commentsRes = await fetch(
        `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "user-agent": "storyteller",
          },
        }
      )
      const comments = commentsRes.ok
        ? (
            (await commentsRes.json()) as {
              user: { login: string }
              body: string
              created_at: string
            }[]
          ).map((c) => ({
            author: c.user?.login ?? "unknown",
            text: c.body,
            createdAt: c.created_at,
          }))
        : []
      return { state: data.state, url: data.html_url, comments }
    },
    async fetchRepo({ token, repo }) {
      const res = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "storyteller",
        },
      })
      if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    },
  },
  trello: {
    async createCard({ apiKey, token, idList, name, desc }) {
      const params = new URLSearchParams({
        key: apiKey,
        token,
        idList,
        name,
        desc,
      })
      const res = await fetch(`https://api.trello.com/1/cards?${params}`, {
        method: "POST",
      })
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as { id: string; url: string }
      return { externalId: data.id, url: data.url }
    },
    async fetchCard({ apiKey, token, cardId }) {
      const params = new URLSearchParams({ key: apiKey, token, cards: "all" })
      const res = await fetch(
        `https://api.trello.com/1/cards/${cardId}?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as {
        url: string
        idList: string
        name: string
      }
      const listRes = await fetch(
        `https://api.trello.com/1/lists/${data.idList}?${new URLSearchParams({ key: apiKey, token })}`
      )
      const list = listRes.ok
        ? ((await listRes.json()) as { name: string })
        : null
      const actionsRes = await fetch(
        `https://api.trello.com/1/cards/${cardId}/actions?${new URLSearchParams({ key: apiKey, token, filter: "commentCard" })}`
      )
      const comments = actionsRes.ok
        ? (
            (await actionsRes.json()) as {
              data: { text: string }
              memberCreator: { fullName: string }
              date: string
            }[]
          ).map((a) => ({
            author: a.memberCreator?.fullName ?? "unknown",
            text: a.data?.text ?? "",
            createdAt: a.date,
          }))
        : []
      return { state: list?.name ?? data.name, url: data.url, comments }
    },
    async fetchBoards({ apiKey, token }) {
      const params = new URLSearchParams({ key: apiKey, token })
      const res = await fetch(
        `https://api.trello.com/1/members/me/boards?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as { id: string; name: string }[]
      return data.map((b) => ({ id: b.id, name: b.name }))
    },
    async fetchLists({ apiKey, token, boardId }) {
      const params = new URLSearchParams({ key: apiKey, token })
      const res = await fetch(
        `https://api.trello.com/1/boards/${boardId}/lists?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
      const data = (await res.json()) as { id: string; name: string }[]
      return data.map((l) => ({ id: l.id, name: l.name }))
    },
    async fetchList({ apiKey, token, listId }) {
      const params = new URLSearchParams({ key: apiKey, token })
      const res = await fetch(
        `https://api.trello.com/1/lists/${listId}?${params}`
      )
      if (!res.ok) throw new Error(`Trello API ${res.status}`)
    },
  },
}
```

- [ ] **Step 4: Write the tests + seed**

Create `apps/api/src/__tests__/column-integration.test.ts`:

```ts
import { describe, it, expect, afterAll, vi } from "bun:test"
import { eq } from "drizzle-orm"

process.env.DATABASE_URL =
  "postgres://template:template@localhost:5432/template"
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
process.env.CLIENT_URL = "http://localhost:5173"
process.env.AI_PROVIDER = "mock"
process.env.INTEGRATION_SECRET = "test-integration-secret-32-characters!!"

const { db } = await import("@workspace/db")
const { project, card, integrationCredential } =
  await import("@workspace/schemas")
const { encryptConfig } = await import("../services/credential-crypto")

const PROJ = "test_integ_project"
const CARD = "test_integ_card"

beforeAll(async () => {
  await db.insert(project).values({
    id: PROJ,
    orgId: (await db.select({ id: project.orgId }).from(project).limit(1))[0]!
      .id,
    name: "test integ",
    slug: "test-integ",
    columns: [
      { key: "backlog", title: "Backlog", locked: true },
      { key: "review", title: "Review", locked: true },
      {
        key: "qa",
        title: "QA",
        locked: false,
        integration: {
          type: "github",
          credentialId: "test_integ_cred",
          target: "acme/repo",
        },
      },
    ],
    cardSections: [],
  })
  await db.insert(integrationCredential).values({
    id: "test_integ_cred",
    projectId: PROJ,
    provider: "github",
    config: encryptConfig({ token: "ghp_test" }),
  })
  await db.insert(card).values({
    id: CARD,
    projectId: PROJ,
    keyNo: 1,
    title: "Test card",
    slug: "test-card",
    description: "Some desc",
    acceptanceCriteria: ["c1", "c2"],
    status: "backlog",
    priority: "medium",
    isClosed: false,
  })
})

afterAll(async () => {
  await db.delete(card).where(eq(card.id, CARD))
  await db
    .delete(integrationCredential)
    .where(eq(integrationCredential.id, "test_integ_cred"))
  await db.delete(project).where(eq(project.id, PROJ))
})

describe("publishCardToColumn", () => {
  it("creates one external ticket per card entry, never twice", async () => {
    const { publishCardToColumn } =
      await import("../services/column-integration")
    const createIssue = vi.fn().mockResolvedValue({
      externalId: "42",
      url: "https://github.com/acme/repo/issues/42",
    })
    const fakeProviders = {
      github: { createIssue, fetchIssue: vi.fn(), fetchRepo: vi.fn() },
      trello: {
        createCard: vi.fn(),
        fetchCard: vi.fn(),
        fetchBoards: vi.fn(),
        fetchLists: vi.fn(),
        fetchList: vi.fn(),
      },
    }

    await publishCardToColumn({
      projectId: PROJ,
      cardId: CARD,
      status: "qa",
      providers: fakeProviders,
    })
    await publishCardToColumn({
      projectId: PROJ,
      cardId: CARD,
      status: "qa",
      providers: fakeProviders,
    })

    expect(createIssue).toHaveBeenCalledTimes(1)
    expect(createIssue).toHaveBeenCalledWith({
      token: "ghp_test",
      repo: "acme/repo",
      title: "Test card",
      body: expect.stringContaining("Acceptance criteria"),
    })
    const [row] = await db
      .select({ links: card.externalLinks })
      .from(card)
      .where(eq(card.id, CARD))
    expect(row?.links).toHaveLength(1)
    expect(row?.links[0].type).toBe("github")
    expect(row?.links[0].credentialId).toBe("test_integ_cred")
  })

  it("does nothing for an unconnected column", async () => {
    const { publishCardToColumn } =
      await import("../services/column-integration")
    const createIssue = vi.fn()
    const fakeProviders = {
      github: { createIssue, fetchIssue: vi.fn(), fetchRepo: vi.fn() },
      trello: {
        createCard: vi.fn(),
        fetchCard: vi.fn(),
        fetchBoards: vi.fn(),
        fetchLists: vi.fn(),
        fetchList: vi.fn(),
      },
    }
    await publishCardToColumn({
      projectId: PROJ,
      cardId: CARD,
      status: "backlog",
      providers: fakeProviders,
    })
    expect(createIssue).not.toHaveBeenCalled()
  })

  it("assertConnectableColumn rejects locked columns", async () => {
    const { assertConnectableColumn } =
      await import("../services/column-integration")
    expect(() =>
      assertConnectableColumn(
        [
          { key: "backlog", title: "Backlog", locked: true },
          { key: "qa", title: "QA", locked: false },
        ],
        "backlog"
      )
    ).toThrow()
  })
})
```

(Add `beforeAll` import from bun:test.)

- [ ] **Step 5: Register the subscriber in app.ts**

In `apps/api/src/app.ts`, after the routes are mounted (before `export default app`):

```ts
registerColumnIntegrationSubscriber()
```

with the import. (Subscriber is inert without events in tests — publishCardToColumn is tested directly.)

- [ ] **Step 6: Verify + commit**

Run: `bun test src/__tests__/column-integration.test.ts` in apps/api — PASS (3 tests).
Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add apps/api/src/services/event-bus.ts apps/api/src/services/column-integration.ts apps/api/src/services/providers.ts apps/api/src/app.ts apps/api/src/__tests__/column-integration.test.ts
git commit -m "feat(api): publish cards to connected columns via event subscriber"
```

---

### Task 4: API endpoints — columns PATCH, connect/disconnect, proxies, external fetch

**Files:**

- Modify: `apps/api/src/routes/projects.ts` (PATCH extension, connect/disconnect, trello proxies)
- Modify: `apps/api/src/routes/cards.ts` (external fetch)
- Modify: `apps/web/src/hooks/use-projects.ts` (ProjectDetail.project.columns type already carries the extended ProjectColumn)
- Create: `apps/api/src/__tests__/column-routes.test.ts`

**Interfaces:**

- Consumes: `updateProjectColumnsSchema` (Task 1), `encryptConfig`/`decryptConfig` (Task 3), provider clients (Task 2), `integrationCredential` table
- Produces:
  - `PATCH /api/projects/:slug` body `{ columns }` → replaces columns (locked preserved via schema; cards in removed columns → status "backlog")
  - `POST /api/projects/:slug/columns/:key/connect` body `{ provider, config, target, boardName?, listName? }` → 400 on locked column, validates via provider, stores credential + sets integration
  - `DELETE /api/projects/:slug/columns/:key/connect` → clears integration, deletes credential if unreferenced
  - `GET /api/projects/:slug/integrations/trello/boards?apiKey&token` and `.../lists?apiKey&token&board` → proxied lookups
  - `GET /api/cards/:id/external/:linkId` → `{ state, url, comments }`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/__tests__/column-routes.test.ts` (401-pattern + service-level):

```ts
import { describe, it, expect, afterAll, beforeAll } from "bun:test"

process.env.DATABASE_URL =
  "postgres://template:template@localhost:5432/template"
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
process.env.CLIENT_URL = "http://localhost:5173"
process.env.AI_PROVIDER = "mock"
process.env.INTEGRATION_SECRET = "test-integration-secret-32-characters!!"

const { db } = await import("@workspace/db")
const { integrationCredential } = await import("@workspace/schemas")

describe("column routes", () => {
  it("PATCH /api/projects/:slug with columns returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/acme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          columns: [
            { key: "backlog", title: "Backlog", locked: true },
            { key: "review", title: "Review", locked: true },
          ],
        }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST connect returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/acme/columns/todo/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "github",
          config: { token: "x" },
          target: "acme/repo",
        }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("GET external link returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request(
        "http://localhost/api/cards/card_x/external/link_x?project=acme"
      )
    )
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Implement the endpoints**

In `apps/api/src/services/column-integration.ts`, add `storeCredential` (imports: `encryptConfig` from `./credential-crypto` — extend the existing import):

```ts
export async function storeCredential(params: {
  projectId: string
  provider: "github" | "trello"
  config: Record<string, string>
}): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(integrationCredential).values({
    id,
    projectId: params.projectId,
    provider: params.provider,
    config: encryptConfig(params.config),
  })
  return id
}
```

(`httpError` import from `../middleware/org-scope`; `project` import.)

In `apps/api/src/routes/projects.ts`:

1. Extend the existing PATCH handler — accept `{ cardSections }` OR `{ columns }` (validate the present field):

```ts
const body = c.var.body as { cardSections?: unknown; columns?: unknown }
if (body.columns !== undefined) {
  const parsed = updateProjectColumnsSchema.safeParse(body.columns)
  if (!parsed.success) {
    throw httpError(parsed.error.issues.map((i) => i.message).join("; "), 400)
  }
  const nextColumns = parsed.data.columns
  // cards in removed columns move to backlog
  const kept = new Set(nextColumns.map((c) => c.key))
  await db
    .update(card)
    .set({ status: "backlog", updatedAt: new Date() })
    .where(
      and(eq(card.projectId, projectId), notInArray(card.status, [...kept]))
    )
  const [updated] = await db
    .update(project)
    .set({ columns: nextColumns, updatedAt: new Date() })
    .where(eq(project.id, projectId))
    .returning()
  return c.json({ success: true, data: { project: updated } })
}
```

(Imports: `updateProjectColumnsSchema`, `card`, `notInArray`.)

2. Add connect/disconnect routes after the PATCH:

```ts
projectsRoutes.post(
  "/:slug/columns/:key/connect",
  resolveOrgFromProject,
  requireRole("owner", "admin"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const key = c.req.param("key")
    const body = (await c.req.json()) as {
      provider: "github" | "trello"
      config: Record<string, string>
      target: string
      boardName?: string
      listName?: string
    }
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    if (!proj) throw httpError("Not Found", 404)
    assertConnectableColumn(proj.columns, key)

    if (body.provider === "github") {
      await realProviders.github.fetchRepo({
        token: body.config.token,
        repo: body.target,
      })
    } else {
      await realProviders.trello.fetchList({
        apiKey: body.config.apiKey,
        token: body.config.token,
        listId: body.target,
      })
    }

    const credentialId = await storeCredential({
      projectId,
      provider: body.provider,
      config: body.config,
    })
    const nextColumns = proj.columns.map((col) =>
      col.key === key
        ? {
            ...col,
            integration: {
              type: body.provider,
              credentialId,
              target: body.target,
              boardName: body.boardName,
              listName: body.listName,
            },
          }
        : col
    )
    await db
      .update(project)
      .set({ columns: nextColumns, updatedAt: new Date() })
      .where(eq(project.id, projectId))
    return c.json({ success: true, data: { key } })
  }
)

projectsRoutes.delete(
  "/:slug/columns/:key/connect",
  resolveOrgFromProject,
  requireRole("owner", "admin"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const key = c.req.param("key")
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    if (!proj) throw httpError("Not Found", 404)
    const column = proj.columns.find((col) => col.key === key)
    const credentialId = column?.integration?.credentialId
    const nextColumns = proj.columns.map((col) =>
      col.key === key ? { ...col, integration: null } : col
    )
    await db
      .update(project)
      .set({ columns: nextColumns, updatedAt: new Date() })
      .where(eq(project.id, projectId))
    if (credentialId) {
      const stillUsed = nextColumns.some(
        (col) => col.integration?.credentialId === credentialId
      )
      if (!stillUsed) {
        await db
          .delete(integrationCredential)
          .where(eq(integrationCredential.id, credentialId))
      }
    }
    return c.json({ success: true, data: { key } })
  }
)
```

3. Trello proxy routes (same file):

```ts
projectsRoutes.get(
  "/:slug/integrations/trello/boards",
  resolveOrgFromProject,
  async (c) => {
    const apiKey = c.req.query("apiKey")
    const token = c.req.query("token")
    if (!apiKey || !token) throw httpError("apiKey and token are required", 400)
    const boards = await realProviders.trello.fetchBoards({ apiKey, token })
    return c.json({ success: true, data: boards })
  }
)

projectsRoutes.get(
  "/:slug/integrations/trello/lists",
  resolveOrgFromProject,
  async (c) => {
    const apiKey = c.req.query("apiKey")
    const token = c.req.query("token")
    const board = c.req.query("board")
    if (!apiKey || !token || !board)
      throw httpError("apiKey, token and board are required", 400)
    const lists = await realProviders.trello.fetchLists({
      apiKey,
      token,
      boardId: board,
    })
    return c.json({ success: true, data: lists })
  }
)
```

In `apps/api/src/routes/cards.ts`, add the external fetch route (the GitHub repo comes from the card's column integration, resolved via the project row):

```ts
cardsRoutes.get("/:id/external/:linkId", resolveOrgFromProject, async (c) => {
  const cardId = c.req.param("id")
  const linkId = c.req.param("linkId")
  const projectId = c.var.projectId!
  const [cardRow] = await db
    .select()
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.projectId, projectId)))
    .limit(1)
  if (!cardRow) throw httpError("Not Found", 404)
  const link = cardRow.externalLinks.find((l) => l.id === linkId)
  if (!link) throw httpError("External link not found", 404)

  const [cred] = await db
    .select()
    .from(integrationCredential)
    .where(eq(integrationCredential.id, link.credentialId))
    .limit(1)
  if (!cred) throw httpError("Credential not found", 404)
  const config = decryptConfig(cred.config)

  if (cred.provider === "github") {
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    const column = proj?.columns.find((col) => col.key === link.columnKey)
    const repo = column?.integration?.target
    if (!repo) throw httpError("Column integration missing", 404)
    const issue = await realProviders.github.fetchIssue({
      token: config.token,
      repo,
      issueNumber: link.externalId,
    })
    return c.json({ success: true, data: issue })
  }

  const trello = await realProviders.trello.fetchCard({
    apiKey: config.apiKey,
    token: config.token,
    cardId: link.externalId,
  })
  return c.json({ success: true, data: trello })
})
```

(Imports to add in cards.ts: `integrationCredential`, `project` from `@workspace/schemas`, `decryptConfig` from `../services/credential-crypto`, `realProviders` from `../services/providers`. `ExternalLink.credentialId` was defined in Task 1's schema and written by `publishCardToColumn` in Task 3.)

- [ ] **Step 3: Run tests to verify they pass**

Run: `bun test src/__tests__/column-routes.test.ts` in apps/api — PASS (2 route 401 + 1 unit).
Run: `bun test src/__tests__/column-integration.test.ts` — still PASS.

- [ ] **Step 4: Verify + commit**

Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add apps/api/src/routes/projects.ts apps/api/src/routes/cards.ts apps/api/src/services/column-integration.ts apps/api/src/__tests__/column-routes.test.ts packages/schemas/src/db/card.ts
git commit -m "feat(api): column connect, trello proxies, and external ticket fetch"
```

---

### Task 5: Web hooks for integrations

**Files:**

- Create: `apps/web/src/hooks/use-integrations.ts`
- Modify: `apps/web/src/hooks/use-cards.ts` (external link fetch)

**Interfaces:**

- Consumes: API endpoints from Task 4
- Produces: `useConnectColumn`, `useDisconnectColumn`, `useTrelloBoards`, `useTrelloLists`, `useCardExternalLink(cardId, linkId)` — Task 6 (settings UI) and Task 7 (drawer) consume these

- [ ] **Step 1: Implement use-integrations.ts**

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export function useConnectColumn(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      columnKey: string
      provider: "github" | "trello"
      config: Record<string, string>
      target: string
      boardName?: string
      listName?: string
    }) => {
      const res = await apiClient<Envelope<{ key: string }>>(
        `/api/projects/${slug}/columns/${input.columnKey}/connect`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}

export function useDisconnectColumn(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (columnKey: string) => {
      const res = await apiClient<Envelope<{ key: string }>>(
        `/api/projects/${slug}/columns/${columnKey}/connect`,
        { method: "DELETE" }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}

export function useTrelloBoards(
  slug: string | undefined,
  creds: { apiKey: string; token: string } | null
) {
  return useQuery({
    queryKey: ["integrations", slug, "trello", "boards"],
    queryFn: async () => {
      const res = await apiClient<Envelope<{ id: string; name: string }[]>>(
        `/api/projects/${slug}/integrations/trello/boards?apiKey=${encodeURIComponent(creds!.apiKey)}&token=${encodeURIComponent(creds!.token)}`
      )
      return res.data
    },
    enabled: Boolean(slug && creds),
  })
}

export function useTrelloLists(
  slug: string | undefined,
  creds: { apiKey: string; token: string } | null,
  boardId: string | null
) {
  return useQuery({
    queryKey: ["integrations", slug, "trello", "lists", boardId],
    queryFn: async () => {
      const res = await apiClient<Envelope<{ id: string; name: string }[]>>(
        `/api/projects/${slug}/integrations/trello/lists?apiKey=${encodeURIComponent(creds!.apiKey)}&token=${encodeURIComponent(creds!.token)}&board=${encodeURIComponent(boardId!)}`
      )
      return res.data
    },
    enabled: Boolean(slug && creds && boardId),
  })
}
```

- [ ] **Step 2: Add useCardExternalLink to use-cards.ts**

```ts
export type ExternalTicket = {
  state: string
  url: string
  comments: { author: string; text: string; createdAt: string }[]
}

export function useCardExternalLink(
  cardId: string | undefined,
  linkId: string | undefined,
  projectSlug: string | undefined
) {
  return useQuery({
    queryKey: ["card", cardId, "external", linkId],
    queryFn: async () => {
      const res = await apiClient<Envelope<ExternalTicket>>(
        `/api/cards/${cardId}/external/${linkId}?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(cardId && linkId && projectSlug),
  })
}
```

- [ ] **Step 3: Verify + commit**

Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add apps/web/src/hooks/use-integrations.ts apps/web/src/hooks/use-cards.ts
git commit -m "feat(web): integration hooks and external ticket fetch"
```

---

### Task 6: Settings UI — board columns management + connect dialogs

**Files:**

- Modify: `apps/web/src/routes/project-settings.tsx`
- Create: `apps/web/src/routes/__tests__/project-settings-columns.test.tsx`

**Interfaces:**

- Consumes: `useUpdateProject` (columns payload via PATCH), `useConnectColumn`/`useDisconnectColumn`/`useTrelloBoards`/`useTrelloLists` (Task 5), `ProjectColumn` type
- Produces: editable columns tab — locked rows no actions; rename/delete/add; connect/disconnect per column

- [ ] **Step 1: Write the failing component tests**

Create `apps/web/src/routes/__tests__/project-settings-columns.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const { updateMutate, connectMutate, disconnectMutate } = vi.hoisted(() => ({
  updateMutate: vi.fn(),
  connectMutate: vi.fn(),
  disconnectMutate: vi.fn(),
}))

vi.mock("@/hooks/use-projects", () => ({
  useProject: () => ({
    data: {
      project: {
        id: "p1",
        name: "Loyalty",
        slug: "loyalty",
        description: null,
        orgId: "org1",
        columns: [
          { key: "backlog", title: "Backlog", locked: true },
          { key: "review", title: "Review", locked: true },
          { key: "todo", title: "To Do", locked: false },
        ],
        cardSections: [],
      },
      epics: [],
      cards: [],
    },
  }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: updateMutate, isPending: false }),
}))

vi.mock("@/hooks/use-integrations", () => ({
  useConnectColumn: () => ({ mutate: connectMutate, isPending: false }),
  useDisconnectColumn: () => ({ mutate: disconnectMutate, isPending: false }),
  useTrelloBoards: () => ({ data: [{ id: "b1", name: "Product" }] }),
  useTrelloLists: () => ({ data: [{ id: "l1", name: "Backlog" }] }),
}))

describe("ProjectSettingsPage board columns", () => {
  async function renderSettings() {
    const { ProjectSettingsPage } = await import("../project-settings")
    return render(
      <MemoryRouter>
        <ProjectSettingsPage />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    updateMutate.mockClear()
  })

  it("renders locked columns without actions", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    expect(screen.getAllByText("system")).toHaveLength(2)
  })

  it("adds a column with an auto-generated key", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    fireEvent.click(screen.getByTestId("add-column"))
    fireEvent.change(screen.getByTestId("column-title"), {
      target: { value: "QA" },
    })
    fireEvent.click(screen.getByTestId("column-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      { key: "backlog", title: "Backlog", locked: true },
      { key: "review", title: "Review", locked: true },
      { key: "todo", title: "To Do", locked: false },
      { key: "qa", title: "QA", locked: false, integration: null },
    ])
  })

  it("renames a non-locked column keeping its key", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    fireEvent.click(screen.getByTestId("edit-column-todo"))
    fireEvent.change(screen.getByTestId("column-title"), {
      target: { value: "In work" },
    })
    fireEvent.click(screen.getByTestId("column-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      { key: "backlog", title: "Backlog", locked: true },
      { key: "review", title: "Review", locked: true },
      { key: "todo", title: "In work", locked: false },
    ])
  })

  it("connects a column to github", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    fireEvent.click(screen.getByTestId("connect-column-todo"))
    fireEvent.change(screen.getByTestId("connect-provider"), {
      target: { value: "github" },
    })
    fireEvent.change(screen.getByTestId("connect-token"), {
      target: { value: "ghp_test" },
    })
    fireEvent.change(screen.getByTestId("connect-target"), {
      target: { value: "acme/repo" },
    })
    fireEvent.click(screen.getByTestId("connect-save"))
    expect(connectMutate).toHaveBeenCalledWith(
      {
        columnKey: "todo",
        provider: "github",
        config: { token: "ghp_test" },
        target: "acme/repo",
      },
      expect.any(Object)
    )
  })
})
```

Note: `useUpdateProject` currently accepts `CardSectionInput[]`. Extend it (Task 6 Step 3) to accept `{ columns }` OR the sections array — simplest: keep the sections-only signature and add a sibling mutation in use-integrations.ts: `useUpdateColumns(slug)` with mutationFn `(columns: ProjectColumn[]) => PATCH /api/projects/:slug body { columns }`. Use that in the settings UI for column actions. Update the test mock accordingly (`useUpdateColumns` instead of `useUpdateProject`).

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test project-settings-columns`
Expected: FAIL — testids/mutations missing.

- [ ] **Step 3: Add useUpdateColumns to use-integrations.ts**

```ts
export function useUpdateColumns(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (columns: ProjectColumn[]) => {
      const res = await apiClient<
        Envelope<{ project: { columns: ProjectColumn[] } }>
      >(`/api/projects/${slug}`, { method: "PATCH", body: { columns } })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}
```

with `import type { ProjectColumn } from "@/hooks/use-projects"` — add the type export to use-projects.ts (`ProjectDetail.project.columns` already types it; export `ProjectColumn` there).

- [ ] **Step 4: Implement the columns tab UI**

Replace the read-only "columns" section in `project-settings.tsx` (lines ~170-185) with an editable list mirroring the card-sections tab pattern:

- State: `addingColumn`, `editingKey`, `confirmingKey`, `columnTitle`, `connectKey`, `connectProvider`, `connectToken`, `connectApiKey`, `connectTarget`, `connectBoard`, `connectList`, `trelloCreds`
- Locked rows (`col.locked`): title + "system" badge, no buttons
- Other rows: Edit / Delete (confirm) / Connect (or "Connected: {type}" + Disconnect)
- Add form: title input → key via camelCase (reuse the camelCase helper pattern from card sections — extract `camelCaseKey` into `apps/web/src/lib/camel-case.ts` and import in both places, or duplicate the small helper; prefer extraction)
- Persist via `useUpdateColumns` for add/rename/delete; `useConnectColumn`/`useDisconnectColumn` for connections
- Connect dialog per provider:
  - github: token + repo inputs → Save
  - trello: apiKey + token → fetch boards (useTrelloBoards) → pick board → fetch lists (useTrelloLists) → pick list → Save (target = list id)
- Delete confirm: inline Confirm button (pattern from card sections)

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test project-settings-columns` — PASS (4 tests).
Run: `bun run test project-settings` — PASS (existing sections tests unaffected).

- [ ] **Step 6: Verify + commit**

Run: `bunx tsc -b --noEmit` from apps/web — 0 errors. `bun run typecheck` + `bun run lint` — clean.

```bash
git add apps/web/src/routes/project-settings.tsx apps/web/src/routes/__tests__/project-settings-columns.test.tsx apps/web/src/hooks/use-integrations.ts apps/web/src/hooks/use-projects.ts apps/web/src/lib/camel-case.ts
git commit -m "feat(web): manage board columns and connect integrations in settings"
```

---

### Task 7: Drawer external ticket section + board card indicator

**Files:**

- Modify: `apps/web/src/components/card-drawer.tsx`
- Modify: `apps/web/src/components/board-card.tsx`
- Modify: `apps/web/src/components/__tests__/card-drawer.test.tsx`
- Modify: `apps/web/src/components/__tests__/board-card.test.tsx`

**Interfaces:**

- Consumes: `useCardExternalLink` (Task 5); `card.externalLinks` from card detail API (verify `useCardDetail` returns it — the detail endpoint selects the full row, so it's present)

- [ ] **Step 1: Write the failing tests**

Append to `apps/web/src/components/__tests__/card-drawer.test.tsx`:

```tsx
vi.mock("@/hooks/use-cards", () => ({
  // ...existing mocks...
  useCardExternalLink: () => ({
    data: {
      state: "open",
      url: "https://github.com/acme/repo/issues/42",
      comments: [
        {
          author: "alice",
          text: "Needs spec",
          createdAt: "2026-08-01T00:00:00Z",
        },
      ],
    },
  }),
}))
```

Add to the mockDetail's card: `externalLinks: [{ id: "link1", type: "github", externalId: "42", url: "https://github.com/acme/repo/issues/42", columnKey: "review", createdAt: "2026-08-01T00:00:00Z" }]` and the test:

```tsx
it("renders the external ticket section with live state and comments", async () => {
  await renderDrawer()
  expect(screen.getByText("External ticket")).toBeInTheDocument()
  expect(screen.getByText("github")).toBeInTheDocument()
  expect(screen.getByText("open")).toBeInTheDocument()
  expect(screen.getByText(/Needs spec/)).toBeInTheDocument()
  expect(
    screen.getByRole("link", { name: /github.com\/acme\/repo\/issues\/42/ })
  ).toBeInTheDocument()
})
```

Append to `apps/web/src/components/__tests__/board-card.test.tsx` (check existing mock shape first):

```tsx
it("shows a provider indicator when the card has external links", async () => {
  // render BoardCard with a card having externalLinks: [{ type: "github", ... }]
  expect(screen.getByTestId("external-indicator")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test card-drawer board-card`
Expected: FAIL — section/indicator missing.

- [ ] **Step 3: Implement drawer section**

In `apps/web/src/components/card-drawer.tsx`, in the details tab (after Attachments), add:

```tsx
{
  card.externalLinks && card.externalLinks.length > 0 && (
    <div>
      <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        External ticket
      </p>
      <div className="space-y-3">
        {card.externalLinks.map((link) => (
          <ExternalTicketCard
            key={link.id}
            cardId={cardId}
            link={link}
            projectSlug={projectSlug}
          />
        ))}
      </div>
    </div>
  )
}
```

Add the helper component in the same file:

```tsx
function ExternalTicketCard({
  cardId,
  link,
  projectSlug,
}: {
  cardId: string
  link: { id: string; type: string; url: string }
  projectSlug: string
}) {
  const { data: ticket } = useCardExternalLink(cardId, link.id, projectSlug)
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
          {link.type}
        </span>
        {ticket && (
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
              ticket.state === "open" || ticket.state === "todo"
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {ticket.state}
          </span>
        )}
        <a
          href={ticket?.url ?? link.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto truncate text-xs text-primary underline"
        >
          {ticket?.url ?? link.url}
        </a>
      </div>
      {ticket && ticket.comments.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
          {ticket.comments.map((c, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium">{c.author}:</span> {c.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Also update `useCardDetail`'s `CardDetail` type in use-cards.ts to include `externalLinks` (or type the drawer's card access loosely — prefer extending the type).

- [ ] **Step 4: Implement board indicator**

In `apps/web/src/components/board-card.tsx`, when `card.externalLinks?.length > 0`, render a small icon next to the card title:

```tsx
{
  card.externalLinks && card.externalLinks.length > 0 && (
    <span
      data-testid="external-indicator"
      className="font-mono text-[10px] text-primary"
      title={`${card.externalLinks[0].type} linked`}
    >
      {card.externalLinks[0].type === "github" ? "GH" : "TR"}
    </span>
  )
}
```

(BoardCard's `card` prop type lives in `use-cards.ts` `BoardCard` — add `externalLinks?: ExternalLink[]` there, importing the type from `@workspace/schemas`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test card-drawer board-card` — PASS.

- [ ] **Step 6: Verify + commit**

Run: `bunx tsc -b --noEmit` from apps/web — 0 errors. `bun run typecheck` + `bun run lint` — clean.

```bash
git add apps/web/src/components/card-drawer.tsx apps/web/src/components/board-card.tsx apps/web/src/components/__tests__/card-drawer.test.tsx apps/web/src/components/__tests__/board-card.test.tsx apps/web/src/hooks/use-cards.ts
git commit -m "feat(web): show external ticket state and comments in card drawer"
```

---

## Post-Plan Verification

- [ ] `bun run test` passes (root vitest)
- [ ] `bun test` passes in `apps/api` (`--parallel=2` if the health-check race appears)
- [ ] `bunx tsc -b --noEmit` clean in apps/web; `bun run typecheck` + `bun run lint` clean
- [ ] Manual: connect a column to GitHub with a real PAT → move a card → issue created once in the repo → drawer shows state + comments; settings columns CRUD works; trello connect flow fetches boards/lists
