# Chat History + Inline Approve/Reject Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist project chat history to the database, left-align the chat view, and render AI board replies inline with approve/reject actions.

**Architecture:** New `chat_message` Drizzle table + `/api/chat` GET/POST routes. Board replies store a `proposalId` and the frontend reuses the existing proposal detail + approve/reject endpoints. The chat view rehydrates from `/api/chat` on mount and persists each exchange after AI calls. Approve/reject reuse the existing `/api/proposals/:id/approve` + `/reject`.

**Tech Stack:** Bun, Hono, Drizzle ORM, Zod, React 19, React Query, shadcn (`@workspace/ui`), Vitest, Playwright.

## Global Constraints

- No new npm dependencies.
- Named exports only; `type` imports preferred.
- All UI components from `@workspace/ui/components/*`; never raw HTML where a shadcn component exists.
- Conventional Commits; commit after every green task.
- Test invocation: web tests from repo ROOT via `bunx vitest run <path>` (`bun --filter web test` is broken repo-wide — root `vitest.config.ts` not inherited from `apps/web` cwd).
- API tests use `bun:test` and run with `bun test` from `apps/api`.
- Keep data-testids: `prompt-input`, `clarify-answer`, `approve-proposal`, `limit-tooltip`, `view-switcher-*`.
- DB schema changes require a migration: `bun --filter @workspace/db generate` after editing schema, then apply via the deploy/migrate step (do NOT auto-migrate at runtime).

---

## Task 1: chat_message schema + validation

**Files:**

- Create: `packages/schemas/src/db/chat-message.ts`
- Create: `packages/schemas/src/validations/chat.ts`
- Modify: `packages/schemas/src/index.ts` (re-export both)

**Interfaces:**

- Consumes: `project`, `proposal` tables from `@workspace/schemas`.
- Produces: `chatMessage` table; `chatMessageInputSchema` (zod) + `type ChatMessageInput`; both re-exported from `@workspace/schemas` (table) and `@workspace/schemas/validations/chat` (validation).

- [ ] **Step 1: Create the table**

`packages/schemas/src/db/chat-message.ts`:

```ts
import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { project } from "./project"
import { proposal } from "./proposal"

export const chatMessage = pgTable("chat_message", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "ai">().notNull(),
  kind: text("kind")
    .$type<"prompt" | "board" | "clarifying" | "error">()
    .notNull(),
  content: text("content").notNull().default(""),
  questions: json("questions")
    .$type<{ question: string; options?: string[] }[] | null>()
    .default(null),
  proposalId: text("proposal_id").references(() => proposal.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
```

- [ ] **Step 2: Create the validation**

`packages/schemas/src/validations/chat.ts`:

```ts
import { z } from "zod"

export const chatMessageInputSchema = z.object({
  role: z.enum(["user", "ai"]),
  kind: z.enum(["prompt", "board", "clarifying", "error"]),
  content: z.string().max(10_000, "Content is too long").optional().default(""),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).optional(),
      })
    )
    .nullable()
    .optional()
    .default(null),
  proposalId: z.string().nullable().optional().default(null),
})

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>
```

- [ ] **Step 3: Re-export from index**

In `packages/schemas/src/index.ts`, add:

```ts
export * from "./db/chat-message"
export * from "./validations/chat"
```

(Add after the other `./db/comment` / `./validations/*` lines, alphabetically.)

- [ ] **Step 4: Generate the migration**

Run: `bun --filter @workspace/db generate`
Expected: creates a new migration SQL + updates the snapshot (chat_message table).

- [ ] **Step 5: Write a validation test**

Create `packages/schemas/src/__tests__/chat-validation.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { chatMessageInputSchema } from "../validations/chat"

describe("chatMessageInputSchema", () => {
  it("accepts a minimal user prompt", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "user",
      kind: "prompt",
      content: "hi",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a board reply with a proposalId", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "ai",
      kind: "board",
      content: "Generated 3 cards",
      proposalId: "prop_1",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a clarifying reply with questions", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "ai",
      kind: "clarifying",
      questions: [{ question: "What audience?", options: ["B2B", "B2C"] }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid role", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "bot",
      kind: "prompt",
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 6: Run the validation test**

Run: `bunx vitest run packages/schemas/src/__tests__/chat-validation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/schemas/src/db/chat-message.ts packages/schemas/src/validations/chat.ts packages/schemas/src/index.ts packages/schemas/src/__tests__/chat-validation.test.ts packages/db/drizzle/*
git commit -m "feat(schemas): add chat message table and validation"
```

---

## Task 2: Chat API routes

**Files:**

- Create: `apps/api/src/routes/chat.ts`
- Modify: `apps/api/src/app.ts` (mount route)
- Test: `apps/api/src/__tests__/chat.test.ts`

**Interfaces:**

- Consumes: `chatMessage` table + `chatMessageInputSchema` (Task 1); `resolveOrgFromProject`, `requireRole`, `httpError`, `errorHandler`, `AppEnv`; `generateId` from `../utils`.
- Produces: `GET /api/chat?project=<slug>` → `{ success, data: ChatMessageRow[] }`; `POST /api/chat` → `{ success, data: ChatMessageRow }` (201). Route constant `chatRoutes`.

- [ ] **Step 1: Write the failing route test**

`apps/api/src/__tests__/chat.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("chat routes (validation gate)", () => {
  it("GET /api/chat returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/chat?project=proj_x")
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/chat returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/chat?project=proj_x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "user", kind: "prompt", content: "hi" }),
      })
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/chat rejects an invalid body", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/chat?project=proj_x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "bot" }),
      })
    )
    expect([400, 401, 404]).toContain(res.status)
  })
})
```

- [ ] **Step 2: Run to confirm fail**

Run: `bun test apps/api/src/__tests__/chat.test.ts` (from `apps/api`)
Expected: FAIL — module `../routes/chat` not found / route not mounted (404).

- [ ] **Step 3: Implement the route**

`apps/api/src/routes/chat.ts`:

```ts
import { Hono } from "hono"
import { asc, eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { chatMessage } from "@workspace/schemas"
import { chatMessageInputSchema } from "@workspace/schemas/validations/chat"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { validateBody } from "../middleware/validate"
import { generateId } from "../utils"
import type { AppEnv } from "../middleware/env"

export const chatRoutes = new Hono<AppEnv>()
chatRoutes.onError(errorHandler)

chatRoutes.use("*", resolveOrgFromProject)

chatRoutes.get("/", requireRole("owner", "admin", "member"), async (c) => {
  const projectId = c.var.projectId!
  const rows = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.projectId, projectId))
    .orderBy(asc(chatMessage.createdAt))
  return c.json({ success: true, data: rows })
})

chatRoutes.post(
  "/",
  requireRole("owner", "admin", "member"),
  validateBody(chatMessageInputSchema),
  async (c) => {
    const projectId = c.var.projectId!
    const body = c.var.body as {
      role: "user" | "ai"
      kind: "prompt" | "board" | "clarifying" | "error"
      content?: string
      questions?: { question: string; options?: string[] }[] | null
      proposalId?: string | null
    }
    const [row] = await db
      .insert(chatMessage)
      .values({
        id: generateId(),
        projectId,
        role: body.role,
        kind: body.kind,
        content: body.content ?? "",
        questions: body.questions ?? null,
        proposalId: body.proposalId ?? null,
      })
      .returning()
    return c.json({ success: true, data: row }, 201)
  }
)
```

Verify `validateBody` signature: it must set `c.var.body` from the parsed schema — check `apps/api/src/middleware/validate.ts` matches this usage (read it; if it stores the raw body or a different var, adapt `body` access accordingly).

- [ ] **Step 4: Mount the route**

In `apps/api/src/app.ts`, add import `import { chatRoutes } from "./routes/chat"` and after the existing route mounts (near the `/api/proposals` mount at line 136):

```ts
app.route("/api/chat", chatRoutes)
```

- [ ] **Step 5: Run to confirm pass**

Run: `bun test apps/api/src/__tests__/chat.test.ts` (from `apps/api`)
Expected: PASS (3 tests). Then run the full api suite: `bun test apps/api/src/__tests__` — must stay green (imports work, no test collision).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/chat.ts apps/api/src/app.ts apps/api/src/__tests__/chat.test.ts
git commit -m "feat(api): add chat history routes"
```

---

## Task 3: use-chat hooks (web)

**Files:**

- Create: `apps/web/src/hooks/use-chat.ts`
- Test: `apps/web/src/hooks/__tests__/use-chat.test.tsx`

**Interfaces:**

- Consumes: `apiClient` from `@/lib/api-client`; `chatMessageInputSchema` types conceptually (client re-declares the row shape).
- Produces: `ChatMessageRow` type; `useChatMessages(projectSlug: string | undefined)` returning `useQuery<ChatMessageRow[]>`; `useAddChatMessage(projectSlug: string)` returning a mutation `(input: ChatMessageInput) => Promise<ChatMessageRow>`.

Row shape (mirror the table select):

```ts
export type ChatMessageRow = {
  id: string
  projectId: string
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content: string
  questions: { question: string; options?: string[] }[] | null
  proposalId: string | null
  createdAt: string
  updatedAt: string
}

export type ChatMessageInput = {
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content?: string
  questions?: { question: string; options?: string[] }[] | null
  proposalId?: string | null
}
```

- [ ] **Step 1: Write the failing hook test**

`apps/web/src/hooks/__tests__/use-chat.test.tsx` (mock `@/lib/api-client`; pattern from `use-graph.test.tsx`):

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const mockApiClient = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiClient: mockApiClient }))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useChatMessages", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fetches messages for a project", async () => {
    mockApiClient.mockResolvedValue({
      success: true,
      data: [
        {
          id: "m1",
          role: "user",
          kind: "prompt",
          content: "hi",
          projectId: "p1",
          questions: null,
          proposalId: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
    })
    const { useChatMessages } = await import("../use-chat")
    const { result } = renderHook(() => useChatMessages("acme"), { wrapper })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(mockApiClient).toHaveBeenCalledWith("/api/chat?project=acme")
  })
})

describe("useAddChatMessage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("posts a message and returns the row", async () => {
    mockApiClient.mockResolvedValue({
      success: true,
      data: {
        id: "m2",
        role: "ai",
        kind: "board",
        content: "ok",
        projectId: "p1",
        questions: null,
        proposalId: "prop_1",
        createdAt: "",
        updatedAt: "",
      },
    })
    const { useAddChatMessage } = await import("../use-chat")
    const { result } = renderHook(() => useAddChatMessage("acme"), { wrapper })
    result.current.mutate({
      role: "ai",
      kind: "board",
      content: "ok",
      proposalId: "prop_1",
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiClient).toHaveBeenCalledWith(
      "/api/chat?project=acme",
      expect.objectContaining({ method: "POST" })
    )
  })
})
```

- [ ] **Step 2: Run to confirm fail**

Run: `bunx vitest run apps/web/src/hooks/__tests__/use-chat.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

`apps/web/src/hooks/use-chat.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type ChatMessageRow = {
  id: string
  projectId: string
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content: string
  questions: { question: string; options?: string[] }[] | null
  proposalId: string | null
  createdAt: string
  updatedAt: string
}

export type ChatMessageInput = {
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content?: string
  questions?: { question: string; options?: string[] }[] | null
  proposalId?: string | null
}

export function useChatMessages(projectSlug: string | undefined) {
  return useQuery({
    queryKey: ["chat", projectSlug],
    queryFn: async () => {
      const res = await apiClient<Envelope<ChatMessageRow[]>>(
        `/api/chat?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}

export function useAddChatMessage(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChatMessageInput) => {
      const res = await apiClient<Envelope<ChatMessageRow>>(
        `/api/chat?project=${encodeURIComponent(projectSlug)}`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", projectSlug] }),
  })
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `bunx vitest run apps/web/src/hooks/__tests__/use-chat.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-chat.ts apps/web/src/hooks/__tests__/use-chat.test.tsx
git commit -m "feat(web): add chat history query and mutation hooks"
```

---

## Task 4: ChatThread component

**Files:**

- Create: `apps/web/src/components/chat-thread.tsx`
- Test: `apps/web/src/components/__tests__/chat-thread.test.tsx`

**Interfaces:**

- Consumes: `ChatMessageRow` from `@/hooks/use-chat`; `useProposal` from `@/hooks/use-proposals`; `useApproveProposal`, `useRejectProposal` from `@/hooks/use-proposals`; `useQueryClient` from `@tanstack/react-query`.
- Produces: `ChatThread({ messages, projectSlug, onClarifyAnswer }: { messages: ChatMessageRow[]; projectSlug: string; onClarifyAnswer: (index: number, answers: string[]) => void })` — renders the persisted message list; board replies render proposal changes + approve/reject; clarifying replies render questions (answers managed by parent state passed via a callback).

- [ ] **Step 1: Write the failing component test**

`apps/web/src/components/__tests__/chat-thread.test.tsx` (mock the proposal hooks):

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

vi.mock("@/hooks/use-proposals", () => ({
  useProposal: () => ({
    data: {
      proposal: {
        id: "prop_1",
        instruction: "Build loyalty",
        status: "pending",
        createdAt: "",
      },
      changes: [
        {
          id: "ch1",
          changeType: "create",
          targetCardId: null,
          newData: { title: "Loyalty card" },
          relationSummary: [],
          conflictFlags: [],
        },
      ],
    },
  }),
  useApproveProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectProposal: () => ({ mutate: vi.fn(), isPending: false }),
}))

const messages = [
  {
    id: "m1",
    projectId: "p1",
    role: "user" as const,
    kind: "prompt" as const,
    content: "Build a loyalty program",
    questions: null,
    proposalId: null,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "m2",
    projectId: "p1",
    role: "ai" as const,
    kind: "board" as const,
    content: "Generated 3 cards",
    questions: null,
    proposalId: "prop_1",
    createdAt: "",
    updatedAt: "",
  },
]

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("ChatThread", () => {
  it("renders a user prompt", () => {
    const { ChatThread } = await import("../chat-thread")
    render(
      <ChatThread
        messages={messages.slice(0, 1)}
        projectSlug="acme"
        onClarifyAnswer={vi.fn()}
      />,
      { wrapper }
    )
    expect(screen.getByText("Build a loyalty program")).toBeInTheDocument()
  })

  it("renders a board reply with approve/reject actions", async () => {
    const { ChatThread } = await import("../chat-thread")
    render(
      <ChatThread
        messages={messages}
        projectSlug="acme"
        onClarifyAnswer={vi.fn()}
      />,
      { wrapper }
    )
    expect(screen.getByText("Generated 3 cards")).toBeInTheDocument()
    expect(await screen.findByText("Loyalty card")).toBeInTheDocument()
    expect(screen.getByTestId("approve-proposal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm fail**

Run: `bunx vitest run apps/web/src/components/__tests__/chat-thread.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

`apps/web/src/components/chat-thread.tsx`:

```tsx
import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  useProposal,
  useApproveProposal,
  useRejectProposal,
} from "@/hooks/use-proposals"
import type { ChatMessageRow } from "@/hooks/use-chat"

function BoardReply({
  proposalId,
  projectSlug,
}: {
  proposalId: string
  projectSlug: string
}) {
  const qc = useQueryClient()
  const { data } = useProposal(proposalId, projectSlug)
  const approve = useApproveProposal(projectSlug)
  const reject = useRejectProposal(projectSlug)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const status = data?.proposal.status

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["proposals", projectSlug] })

  if (!data) return null

  return (
    <div
      className="rounded-lg border bg-muted/20 p-3"
      data-testid="chat-board-reply"
    >
      <p className="text-sm font-medium">{data.proposal.instruction}</p>
      <div className="mt-2 space-y-1">
        {data.changes.map((change) => (
          <div
            key={change.id}
            className="rounded border bg-background px-2 py-1 text-xs"
          >
            <span className="mr-2 rounded-full bg-muted px-1.5 py-0.5 font-medium uppercase">
              {change.changeType}
            </span>
            {change.changeType === "create" && (
              <span>New: {String(change.newData.title ?? "")}</span>
            )}
            {change.changeType === "update" && (
              <span>Update card {change.targetCardId}</span>
            )}
            {change.changeType === "close" && (
              <span>Close card {change.targetCardId}</span>
            )}
          </div>
        ))}
      </div>
      {status && status !== "pending" && (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="proposal-status"
        >
          {status}
        </p>
      )}
      {status === "pending" && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            data-testid="approve-proposal"
            disabled={approve.isPending}
            onClick={() => approve.mutate(proposalId, { onSuccess: refresh })}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejecting((v) => !v)}
          >
            Reject
          </Button>
          {rejecting && (
            <div className="flex items-center gap-2">
              <input
                data-testid="reject-reason"
                className="w-40 rounded-md border bg-background px-2 py-1 text-xs"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={reject.isPending}
                onClick={() =>
                  reject.mutate(
                    { id: proposalId, reason: reason || undefined },
                    {
                      onSuccess: () => {
                        setRejecting(false)
                        setReason("")
                        refresh()
                      },
                    }
                  )
                }
              >
                Confirm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ChatThread({
  messages,
  projectSlug,
  onClarifyAnswer,
}: {
  messages: ChatMessageRow[]
  projectSlug: string
  onClarifyAnswer: (index: number, answers: string[]) => void
}) {
  const clarifyingIndex = useMemo(() => {
    let last = -1
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].kind === "clarifying" && messages[i].role === "ai") {
        last = i
      }
    }
    return last
  }, [messages])

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, i) => {
        if (message.kind === "prompt") {
          return (
            <div
              key={message.id}
              className="self-start rounded-lg bg-primary/10 px-3 py-2 text-sm"
            >
              {message.content}
            </div>
          )
        }
        if (message.kind === "board" && message.proposalId) {
          return (
            <div key={message.id} className="w-full self-start">
              <BoardReply
                proposalId={message.proposalId}
                projectSlug={projectSlug}
              />
            </div>
          )
        }
        if (message.kind === "clarifying" && message.questions) {
          return (
            <div key={message.id} className="w-full self-start">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  A few questions to clarify the board:
                </p>
                {message.questions.map((q, qi) => (
                  <p key={qi} className="mt-1 text-sm">
                    {qi + 1}. {q.question}
                    {q.options && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({q.options.join(", ")})
                      </span>
                    )}
                  </p>
                ))}
                {i === clarifyingIndex && (
                  <Button
                    size="sm"
                    className="mt-3"
                    data-testid="chat-clarify-answer"
                    onClick={() =>
                      onClarifyAnswer(
                        i,
                        message.questions!.map(() => "")
                      )
                    }
                  >
                    Answer
                  </Button>
                )}
              </div>
            </div>
          )
        }
        if (message.kind === "error") {
          return (
            <div
              key={message.id}
              className="self-start rounded-lg border px-3 py-2 text-sm text-destructive"
            >
              {message.content}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
```

Note: the "Answer" flow needs the parent to provide answer inputs. In Task 5 the parent keeps answer state per clarifying message index (like the current `pendingQuestions`/`clarifyAnswers`) and calls `onClarifyAnswer` with the persisted questions to re-open the answer form. Adjust the callback signature to match Task 5's usage — if it diverges, prefer the Task 5 consumer (the component must serve the page). If React import is missing at top, add `import * as React from "react"` or import `useState` directly.

- [ ] **Step 4: Run to confirm pass**

Run: `bunx vitest run apps/web/src/components/__tests__/chat-thread.test.tsx`
Expected: PASS (2 tests). Then full web suite: `bunx vitest run apps/web/src` — must stay green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/chat-thread.tsx apps/web/src/components/__tests__/chat-thread.test.tsx
git commit -m "feat(web): render chat thread with inline board actions"
```

---

## Task 5: Rewrite project-chat page

**Files:**

- Modify: `apps/web/src/routes/project-chat.tsx`

**Interfaces:**

- Consumes: `ProjectTabs` (Task A2 — keep it at top of the page); `useChatMessages`, `useAddChatMessage` from `@/hooks/use-chat`; `ChatThread` from `@/components/chat-thread`; `useAiGenerate`, `useAiClarify` from `@/hooks/use-ai`; existing `useProposals`, `useUsage`, `handleLimitError`.
- Produces: nothing new (page rewrite).

- [ ] **Step 1: Rewrite the page**

Replace `apps/web/src/routes/project-chat.tsx` with:

```tsx
import { useState } from "react"
import { useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useAiGenerate, useAiClarify } from "@/hooks/use-ai"
import { useProposals } from "@/hooks/use-proposals"
import { useProject } from "@/hooks/use-projects"
import { useUsage, handleLimitError } from "@/hooks/use-billing"
import { useChatMessages, useAddChatMessage } from "@/hooks/use-chat"
import { ProjectTabs } from "@/components/project-tabs"
import { ChatThread } from "@/components/chat-thread"

export function ProjectChatPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const generate = useAiGenerate(slug ?? "")
  const clarify = useAiClarify(slug ?? "")
  const { data: proposals } = useProposals(slug)
  const { data: projectDetail } = useProject(slug)
  const orgId = projectDetail?.project.orgId
  const usage = useUsage(orgId)
  const aiActionsLimited = usage.isAtLimit("aiActions")
  const { data: chatMessages = [] } = useChatMessages(slug)
  const addMessage = useAddChatMessage(slug ?? "")
  const [prompt, setPrompt] = useState("")
  const [pending, setPending] = useState(false)
  const [answerPrompts, setAnswerPrompts] = useState<{
    index: number
    questions: { question: string; options?: string[] }[]
    answers: string[]
  } | null>(null)
  const [priorAnswers, setPriorAnswers] = useState("")

  async function persistPair(
    userText: string,
    aiReply: {
      kind: "board" | "clarifying" | "error"
      content?: string
      questions?: { question: string; options?: string[] }[]
      proposalId?: string
    }
  ) {
    if (!slug) return
    await addMessage.mutateAsync({
      role: "user",
      kind: "prompt",
      content: userText,
    })
    await addMessage.mutateAsync({
      role: "ai",
      kind: aiReply.kind,
      content: aiReply.content ?? "",
      questions: aiReply.questions ?? null,
      proposalId: aiReply.proposalId ?? null,
    })
  }

  async function onGenerate() {
    if (!prompt.trim() || pending) return
    const userPrompt = prompt
    setPrompt("")
    setPending(true)
    try {
      const result = await generate.mutateAsync({ prompt: userPrompt })
      if (result.kind === "clarifying") {
        await persistPair(userPrompt, {
          kind: "clarifying",
          questions: result.questions,
        })
      } else {
        await persistPair(userPrompt, {
          kind: "board",
          content: `Generated ${result.proposal.changeCount} story cards.`,
          proposalId: result.proposal.proposalId,
        })
      }
    } catch (e) {
      if (handleLimitError(e, orgId ?? "", queryClient)) return
      await persistPair(userPrompt, {
        kind: "error",
        content: (e as Error).message,
      })
    } finally {
      setPending(false)
    }
  }

  async function onClarifyAnswer(index: number, answers: string[]) {
    if (!answerPrompts) return
    const message = chatMessages[index]
    const qs = message?.questions ?? []
    const summary = qs
      .map((q, qi) => `${q.question} → ${answers[qi] ?? ""}`)
      .join("\n")
    const newPrior = priorAnswers ? `${priorAnswers}\n${summary}` : summary
    setPriorAnswers(newPrior)
    setPending(true)
    try {
      const result = await clarify.mutateAsync({
        question: qs.map((q) => q.question).join(" | "),
        answer: answers.join(" | "),
        priorAnswers: newPrior,
        prompt:
          chatMessages
            .filter((m) => m.kind === "prompt")
            .map((m) => m.content)
            .join(" ") || "",
      })
      if (result.kind === "clarifying") {
        await addMessage.mutateAsync({
          role: "ai",
          kind: "clarifying",
          questions: result.questions,
        })
      } else {
        await addMessage.mutateAsync({
          role: "ai",
          kind: "board",
          content: `Generated ${result.proposal.changeCount} story cards.`,
          proposalId: result.proposal.proposalId,
        })
      }
    } catch (e) {
      if (handleLimitError(e, orgId ?? "", queryClient)) return
      await addMessage.mutateAsync({
        role: "ai",
        kind: "error",
        content: (e as Error).message,
      })
    } finally {
      setAnswerPrompts(null)
      setPending(false)
    }
  }

  const generateButton = (
    <Button
      onClick={onGenerate}
      disabled={generate.isPending || pending || aiActionsLimited}
    >
      {pending ? "Generating..." : "Generate"}
    </Button>
  )

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <ProjectTabs slug={slug ?? ""} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <span className="text-xs text-muted-foreground">
          {proposals?.length ?? 0} proposals
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        {chatMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Describe the product you want to build. Storyteller will generate a
            board of stories you can review and approve.
          </p>
        ) : (
          <ChatThread
            messages={chatMessages}
            projectSlug={slug ?? ""}
            onClarifyAnswer={(i, _a) => {
              const m = chatMessages[i]
              if (!m?.questions) return
              setAnswerPrompts({
                index: i,
                questions: m.questions,
                answers: m.questions.map(() => ""),
              })
            }}
          />
        )}

        {answerPrompts && (
          <div className="space-y-2 rounded-lg border p-4">
            {answerPrompts.questions.map((q, qi) => (
              <div key={qi} className="space-y-1">
                <label className="text-sm">{q.question}</label>
                <input
                  data-testid="clarify-answer"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={answerPrompts.answers[qi] ?? ""}
                  onChange={(e) =>
                    setAnswerPrompts((prev) =>
                      prev
                        ? {
                            ...prev,
                            answers: prev.answers.map((a, i) =>
                              i === qi ? e.target.value : a
                            ),
                          }
                        : prev
                    )
                  }
                />
              </div>
            ))}
            <Button
              onClick={() =>
                onClarifyAnswer(answerPrompts.index, answerPrompts.answers)
              }
              disabled={clarify.isPending || pending}
            >
              {pending ? "Generating..." : "Submit answers"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          data-testid="prompt-input"
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
          rows={3}
          placeholder="Describe your product idea..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generate.isPending || pending || aiActionsLimited}
        />
        {aiActionsLimited ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex" data-testid="limit-tooltip" />
              }
            >
              {generateButton}
            </TooltipTrigger>
            <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
          </Tooltip>
        ) : (
          generateButton
        )}
      </div>
    </div>
  )
}
```

Notes:

- The layout is `flex w-full max-w-3xl flex-col gap-4` — left-aligned (no `mx-auto`).
- On error, if `handleLimitError` returns true (limit block), the pair is NOT persisted — the limit-banner + toast cover it (consistent with the board flow).
- The clarifying "Answer" button in `ChatThread` calls `onClarifyAnswer`, which opens the inline `answerPrompts` form here. `ChatThread`'s internal "Answer" button (Task 4) should call `onClarifyAnswer(i, questions.map(() => ""))` — if the component's callback shape differs from this usage, adjust the page or component so they agree (the page is the consumer; update the component if needed).

- [ ] **Step 2: Typecheck + build**

Run: `bun --filter web typecheck` then `bun --filter web build`
Expected: PASS.

- [ ] **Step 3: Run web unit tests**

Run: `bunx vitest run apps/web/src` (repo root)
Expected: PASS — chat-thread + use-chat + all existing suites (approx 138 + new).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/project-chat.tsx
git commit -m "feat(web): persist chat history and inline board actions"
```

---

## Task 6: E2E chat history + inline approval

**Files:**

- Modify: `apps/e2e/src/core-loop.test.ts`

**Interfaces:**

- Consumes: existing `signIn`, `runPrompt`, `GRAPH_PROJECT_SLUG` from the e2e helpers; the chat page's `prompt-input`, `chat-board-reply`, `approve-proposal`, `proposal-status` testids.

- [ ] **Step 1: Add an inline-approve + history assertion to the phase-2 J2 test**

In `apps/e2e/src/core-loop.test.ts`, the phase-2 J2 test currently covers comments/SSE. Add a NEW test after it (or extend the existing chat journey) that:

1. Signs in as `TEST_USER`.
2. Goes to `/projects/${GRAPH_PROJECT_SLUG}/chat`.
3. Runs a prompt via `runPrompt(page, "Add a referral feature")`.
4. Waits for `[data-testid="chat-board-reply"]` to be visible (inline AI reply).
5. Clicks `approve-proposal` inside the chat thread.
6. Waits for `proposal-status` to contain "approved".
7. Reloads the page (`page.reload()`), waits for the thread, and asserts the user prompt text is still present (history restored).

Example (place in the phase-2 describe block):

```ts
test("J4: chat history persists and board replies approve inline", async ({
  page,
}) => {
  await signIn(page, TEST_USER.email, TEST_USER.password)
  await page.goto(`/projects/${GRAPH_PROJECT_SLUG}/chat`)
  await page.getByTestId("prompt-input").fill("Add a referral program")
  await page.getByRole("button", { name: "Generate" }).click()
  await expect(page.getByTestId("chat-board-reply").first()).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId("approve-proposal").first().click()
  await expect(page.getByTestId("proposal-status").first()).toContainText(
    "approved",
    { timeout: 15_000 }
  )

  await page.reload()
  await expect(page.getByText("Add a referral program")).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByTestId("chat-board-reply").first()).toBeVisible({
    timeout: 15_000,
  })
})
```

Note: `runPrompt` uses `prompt-input` + a "Generate" button, matching this page. If the phase-2 block already has a test numbered J4, use the next free number.

- [ ] **Step 2: Typecheck e2e**

Run: `bunx tsc --noEmit` in `apps/e2e` (or `bun --filter e2e typecheck`)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/e2e/src/core-loop.test.ts
git commit -m "test(e2e): verify chat history and inline board approval"
```

---

## Task 7: Migration + deploy + full verification

**Files:**

- None (migration already generated in Task 1).

- [ ] **Step 1: Apply the migration**

Run: `DATABASE_URL=postgres://template:template@localhost:5432/template bun --filter @workspace/db migrate`
Expected: applies the chat_message migration.

- [ ] **Step 2: Repo checks**

Run: `bun run lint` and `bun run typecheck`
Expected: green (12/12).

- [ ] **Step 3: Full test suites**

Run: `bunx vitest run packages/schemas/src apps/web/src` (repo root) and `bun test apps/api/src/__tests__` (from `apps/api`)
Expected: green.

- [ ] **Step 4: E2E smoke**

Run: `DATABASE_URL=postgres://template:template@localhost:5432/template bunx playwright test` (from `apps/e2e`) — expect the new chat-history test plus unaffected journeys. NOTE: pre-existing e2e failures (seed login, J1 create) are unrelated to this plan — report them, do not fix.

- [ ] **Step 5: Rebuild + redeploy docker**

Run: `docker compose build api web && docker compose up -d --force-recreate --no-deps api web`
Then verify health: `curl http://localhost:3001/api/health` and `docker compose ps`.

- [ ] **Step 6: Report**

Summarize per phase: schema/migration, chat API, hooks, thread component, page rewrite, e2e; test counts; any pre-existing failures out of scope.
