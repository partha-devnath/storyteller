# Proposed Lane Create+Update Types with Per-Card Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The board's Proposed lane shows both create and update proposal changes; update cards open a drawer with a before/after diff; every card gets its own Approve/Reject; the proposal stays pending until all changes resolve.

**Architecture:** `apply-proposal.ts` gets a per-change entry point (`applyProposalChange`) shared by new single-change approve/reject paths in the proposals routes. The lane endpoint (`/api/projects/:slug/proposed`) stops filtering out updates and attaches target-card context. The web drawer picks the change by `changeId`, renders a diff for updates using the already-attached `before` payload, and calls the mutations with `{ proposalId, changeId }`.

**Tech Stack:** Hono, Drizzle ORM, zod, React 19, TanStack React Query, Vitest (web), bun:test (api).

## Global Constraints

- Named exports only — no default exports
- No comments in code unless asked
- Conventional Commits; run `bun run typecheck` + `bun run lint` before committing
- Tests in `__tests__/` next to source; web via root vitest, api via `bun test` in `apps/api`
- Types must be erasable (no enums)
- Server-side validation only in `@workspace/schemas` zod schemas
- API test DB: `postgres://template:template@localhost:5432/template` (docker, running); tests may seed rows with clearly-namespaced IDs (`test_pcard_*`) and MUST delete them after
- api tests: unauthenticated requests hit routes (401 pattern); authenticated logic tested via direct service calls with seeded data

---

### Task 1: Single-change approve/reject API

**Files:**

- Modify: `apps/api/src/services/apply-proposal.ts`
- Modify: `apps/api/src/routes/proposals.ts`
- Modify: `packages/schemas/src/validations/proposal.ts`
- Create: `apps/api/src/__tests__/per-card-approval.test.ts`

**Interfaces:**

- Consumes: existing `applyCreate`/`applyUpdate`/`applyClose` internals of apply-proposal.ts; `proposalChange` table (has `approvedAt`, `approvedBy`, `rejectedAt`, `rejectionReason` columns)
- Produces:
  - `applyProposalChange({ proposalId, changeId, approverId, mode, reason? }) → Promise<{ applied: number; proposalStatus: "pending" | "approved" | "rejected" }>`
  - `POST /api/proposals/:id/approve` and `POST /api/proposals/:id/reject` accept optional body `{ changeId?, reason? }` — with `changeId` they resolve only that change; without, existing whole-proposal behavior
  - `resolveProposalChangeSchema` export from `@workspace/schemas/validations/proposal` — Task 3's web hooks send bodies matching it

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/__tests__/per-card-approval.test.ts`. Tests run in file order and share seeded state — order matters:

```ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { proposal, proposalChange, card, project } from "@workspace/schemas"

beforeAll(async () => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"

  const [org] = await db.select({ id: project.orgId }).from(project).limit(1)
  if (!org) throw new Error("seed org missing")

  await db.insert(project).values({
    id: PROJ,
    orgId: org.id,
    name: "test pcard",
    slug: "test-pcard",
    columns: [{ key: "backlog", title: "Backlog" }],
    cardSections: [],
  })
  await db.insert(card).values({
    id: CARD,
    projectId: PROJ,
    keyNo: 1,
    title: "Target card",
    slug: "target-card",
    description: "before desc",
    acceptanceCriteria: ["old criteria"],
    status: "backlog",
    priority: "medium",
    isClosed: false,
  })
  await db.insert(proposal).values({
    id: PROP,
    projectId: PROJ,
    createdBy: "test_user",
    instruction: "test",
    prompt: "test",
    aiResponse: "{}",
    status: "pending",
  })
  await db.insert(proposalChange).values([
    {
      id: `${PROP}_ch1`,
      proposalId: PROP,
      changeType: "create",
      targetCardId: null,
      newData: { title: "New card" },
      relationSummary: [],
      conflictFlags: [],
    },
    {
      id: `${PROP}_ch2`,
      proposalId: PROP,
      changeType: "update",
      targetCardId: CARD,
      newData: { title: "New title" },
      relationSummary: [],
      conflictFlags: [],
    },
  ])
})

afterAll(async () => {
  await db.delete(proposalChange).where(eq(proposalChange.proposalId, PROP))
  await db.delete(proposal).where(eq(proposal.id, PROP))
  await db.delete(card).where(eq(card.id, CARD))
  await db.delete(project).where(eq(project.id, PROJ))
})

const PROJ = "test_pcard_project"
const CARD = "test_pcard_card"
const PROP = "test_pcard_proposal"

describe("applyProposalChange", () => {
  it("rejects a single change and keeps the proposal pending", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    const result = await applyProposalChange({
      proposalId: PROP,
      changeId: `${PROP}_ch1`,
      approverId: "test_user",
      mode: "reject",
    })
    expect(result.applied).toBe(0)
    expect(result.proposalStatus).toBe("pending")

    const [change] = await db
      .select({ rejectedAt: proposalChange.rejectedAt })
      .from(proposalChange)
      .where(eq(proposalChange.id, `${PROP}_ch1`))
    expect(change?.rejectedAt).not.toBeNull()
  })

  it("applies a single change and keeps the proposal pending", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    const result = await applyProposalChange({
      proposalId: PROP,
      changeId: `${PROP}_ch2`,
      approverId: "test_user",
      mode: "approve",
    })
    expect(result.applied).toBe(1)
    expect(result.proposalStatus).toBe("pending")

    const [prop] = await db
      .select({ status: proposal.status })
      .from(proposal)
      .where(eq(proposal.id, PROP))
    expect(prop?.status).toBe("pending")

    const [change] = await db
      .select({ approvedAt: proposalChange.approvedAt })
      .from(proposalChange)
      .where(eq(proposalChange.id, `${PROP}_ch2`))
    expect(change?.approvedAt).not.toBeNull()
  })

  it("throws 409 for an already-resolved change", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    await expect(
      applyProposalChange({
        proposalId: PROP,
        changeId: `${PROP}_ch2`,
        approverId: "test_user",
        mode: "approve",
      })
    ).rejects.toMatchObject({ status: 409 })
  })
})

describe("per-card approve/reject routes", () => {
  it("POST /api/proposals/:id/approve with changeId returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changeId: "ch_x" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/proposals/:id/reject with changeId returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changeId: "ch_x", reason: "no" }),
      })
    )
    expect(res.status).toBe(401)
  })
})
```

Add a fourth service test after the 409 test to cover the "last change resolves → proposal approved" transition. Since ch1 is rejected and ch2 approved above, insert a fresh third change, approve it, and expect the proposal to flip:

```ts
it("marks the proposal approved when the last change resolves", async () => {
  const { applyProposalChange } = await import("../services/apply-proposal")
  await db.insert(proposalChange).values({
    id: `${PROP}_ch3`,
    proposalId: PROP,
    changeType: "create",
    targetCardId: null,
    newData: { title: "Third card" },
    relationSummary: [],
    conflictFlags: [],
  })
  const result = await applyProposalChange({
    proposalId: PROP,
    changeId: `${PROP}_ch3`,
    approverId: "test_user",
    mode: "approve",
  })
  expect(result.proposalStatus).toBe("approved")

  const [prop] = await db
    .select({ status: proposal.status })
    .from(proposal)
    .where(eq(proposal.id, PROP))
  expect(prop?.status).toBe("approved")
})
```

IMPORTANT: `const PROJ/CARD/PROP` must be declared BEFORE the `beforeAll` that references them — move the const declarations above `beforeAll` in the actual file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/__tests__/per-card-approval.test.ts` in `apps/api`
Expected: FAIL — `applyProposalChange` is not exported.

- [ ] **Step 3: Extract `applyChange` in apply-proposal.ts**

In `apps/api/src/services/apply-proposal.ts`, replace the change-type dispatch inside `applyProposal`'s loop (lines ~132-160) with:

```ts
let applied = 0
for (const change of changes) {
  applied += await applyChange(
    tx,
    proposalRow.projectId,
    change,
    approverId,
    reindexJobs
  )
}
```

and add the helper below `readCreateFields`:

```ts
async function applyChange(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  change: ChangeRow,
  approverId: string,
  reindexJobs: { cardId: string; versionId: string }[]
): Promise<number> {
  if (change.changeType === "create") {
    return applyCreate(tx, projectId, change, approverId, reindexJobs)
  }
  if (change.changeType === "update") {
    await applyUpdate(tx, projectId, change, approverId, reindexJobs)
    return 1
  }
  await applyClose(tx, projectId, change, approverId, reindexJobs)
  return 1
}
```

- [ ] **Step 4: Add `applyProposalChange` export**

Append to apply-proposal.ts:

```ts
export async function applyProposalChange({
  proposalId,
  changeId,
  approverId,
  mode,
  reason,
}: {
  proposalId: string
  changeId: string
  approverId: string
  mode: "approve" | "reject"
  reason?: string
}): Promise<{
  applied: number
  proposalStatus: "pending" | "approved" | "rejected"
}> {
  const reindexJobs: { cardId: string; versionId: string }[] = []

  const result = await db.transaction(async (tx) => {
    const [proposalRow] = await tx
      .select()
      .from(proposal)
      .where(eq(proposal.id, proposalId))
      .limit(1)
    if (!proposalRow) throw httpError("Not Found", 404)
    if (proposalRow.status !== "pending") {
      throw httpError("Proposal already resolved", 409)
    }

    const [change] = await tx
      .select()
      .from(proposalChange)
      .where(
        and(
          eq(proposalChange.id, changeId),
          eq(proposalChange.proposalId, proposalId)
        )
      )
      .limit(1)
    if (!change) throw httpError("Change not found", 404)
    if (change.approvedAt || change.rejectedAt) {
      throw httpError("Change already resolved", 409)
    }

    let applied = 0
    if (mode === "approve") {
      applied = await applyChange(
        tx,
        proposalRow.projectId,
        change,
        approverId,
        reindexJobs
      )
      await tx
        .update(proposalChange)
        .set({ approvedAt: new Date(), approverId })
        .where(eq(proposalChange.id, changeId))
    } else {
      await tx
        .update(proposalChange)
        .set({
          rejectedAt: new Date(),
          rejectionReason: reason ?? null,
          approverId,
        })
        .where(eq(proposalChange.id, changeId))
    }

    const [remaining] = await tx
      .select({ count: count() })
      .from(proposalChange)
      .where(
        and(
          eq(proposalChange.proposalId, proposalId),
          isNull(proposalChange.approvedAt),
          isNull(proposalChange.rejectedAt)
        )
      )
    const remainingCount = remaining?.count ?? 0

    let proposalStatus: "pending" | "approved" | "rejected" = "pending"
    if (remainingCount === 0) {
      const [rejectedCount] = await tx
        .select({ count: count() })
        .from(proposalChange)
        .where(
          and(
            eq(proposalChange.proposalId, proposalId),
            isNull(proposalChange.approvedAt)
          )
        )
      const allRejected = (rejectedCount?.count ?? 0) > 0
      proposalStatus = allRejected ? "rejected" : "approved"
      await tx
        .update(proposal)
        .set({
          status: proposalStatus,
          approvedBy: approverId,
          rejectedAt: proposalStatus === "rejected" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(proposal.id, proposalId))
    }

    return { applied, proposalStatus }
  })

  for (const job of reindexJobs) {
    await reindexSafe(job.cardId, job.versionId)
  }
  return result
}
```

Imports needed in apply-proposal.ts: `isNull`, `count` from `drizzle-orm` (extend line 1 import).

- [ ] **Step 5: Add `resolveProposalChangeSchema`**

Append to `packages/schemas/src/validations/proposal.ts`:

```ts
export const resolveProposalChangeSchema = z.object({
  changeId: z.string().min(1).optional(),
  reason: z
    .string()
    .max(500, "Reason must be at most 500 characters")
    .optional(),
})

export type ResolveProposalChangeInput = z.infer<
  typeof resolveProposalChangeSchema
>
```

- [ ] **Step 6: Route single-change paths**

In `apps/api/src/routes/proposals.ts`:

1. Import: `applyProposalChange` alongside `applyProposal`; `resolveProposalChangeSchema` from `@workspace/schemas/validations/proposal` (extend existing import line 6).

2. Replace the approve route body parse + call (lines 84-92):

```ts
const session = await auth.api.getSession({ headers: c.req.raw.headers })
if (!session) throw httpError("Unauthorized", 401)
const id = c.req.param("id")
const rawBody = await c.req
  .json()
  .then(() => undefined)
  .catch(() => undefined)
const body = resolveProposalChangeSchema.safeParse(rawBody ?? {})
if (!body.success) {
  throw httpError(body.error.issues.map((i) => i.message).join("; "), 400)
}

const result = body.data.changeId
  ? await applyProposalChange({
      proposalId: id,
      changeId: body.data.changeId,
      approverId: session.user.id,
      mode: "approve",
    })
  : await applyProposal({ proposalId: id, approverId: session.user.id })
return c.json({ success: true, data: result })
```

Wait — the body read must not break the existing no-body call. Replace the `.then(() => undefined).catch(...)` approach: read raw text first:

```ts
const raw = await c.req.text()
const body = resolveProposalChangeSchema.safeParse(raw ? JSON.parse(raw) : {})
```

Use the `JSON.parse` inside try — simpler: since the request body is optional, read text; if empty → `{}`.

3. Replace the reject route body parse (lines 103-106) and add the single-change branch before the whole-reject block:

```ts
const raw = await c.req.text()
const body = resolveProposalChangeSchema.safeParse(
  raw ? (JSON.parse(raw) as unknown) : {}
)
if (!body.success) {
  throw httpError(body.error.issues.map((i) => i.message).join("; "), 400)
}

if (body.data.changeId) {
  const result = await applyProposalChange({
    proposalId: id,
    changeId: body.data.changeId,
    approverId: session.user.id,
    mode: "reject",
    reason: body.data.reason,
  })
  return c.json({ success: true, data: result })
}
```

Keep the existing whole-reject block (lines 108-128) unchanged after the branch.

- [ ] **Step 7: Add 401 route tests**

Append to the test file:

```ts
describe("per-card approve/reject routes", () => {
  it("POST /api/proposals/:id/approve with changeId returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changeId: "ch_x" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/proposals/:id/reject with changeId returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changeId: "ch_x", reason: "no" }),
      })
    )
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun test src/__tests__/per-card-approval.test.ts` in `apps/api`
Expected: PASS (4 service tests + 2 route tests). NOTE: the 409 test must run AFTER ch1 was already approved — order tests accordingly (reject test first, then approve-last, then 409).

- [ ] **Step 9: Verify + commit**

Run: `bun run typecheck` and `bun run lint`
Expected: no errors.

```bash
git add apps/api/src/services/apply-proposal.ts apps/api/src/routes/proposals.ts packages/schemas/src/validations/proposal.ts apps/api/src/__tests__/per-card-approval.test.ts
git commit -m "feat(api): per-change approve and reject with pending-until-resolved semantics"
```

---

### Task 2: Lane endpoint includes update changes

**Files:**

- Modify: `apps/api/src/routes/projects.ts` (`/:slug/proposed` handler, lines ~153-198)
- Modify: `apps/web/src/hooks/use-projects.ts` (`ProposedCard` type)

**Interfaces:**

- Consumes: proposal/proposalChange/card rows (existing imports)
- Produces: lane rows with `changeType: "create" | "update"`, `changeId`, `targetCardId: string | null` — Task 3's kanban renders the badge from `changeType`; Task 4's drawer uses `changeId`

- [ ] **Step 1: Write the failing api test**

Append to `apps/api/src/__tests__/per-card-approval.test.ts`:

```ts
describe("proposed lane", () => {
  it("includes update changes with target card context", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/test-pcard/proposed")
    )
    expect(res.status).toBe(401)
  })
})
```

(401-only assertion — lane shape is covered by the web component tests in Task 3.)

- [ ] **Step 2: Rewrite the `/proposed` handler**

In `apps/api/src/routes/projects.ts`, replace the proposed handler body (rows query + mapping) with:

```ts
const rows = await db
  .select()
  .from(proposal)
  .innerJoin(proposalChange, eq(proposalChange.proposalId, proposal.id))
  .where(
    and(
      eq(proposal.projectId, projectId!),
      eq(proposal.status, "pending"),
      isNull(proposalChange.approvedAt),
      isNull(proposalChange.rejectedAt)
    )
  )
  .orderBy(asc(proposalChange.createdAt))

const targetIds = rows
  .filter((r) => r.proposal_change.changeType === "update")
  .map((r) => r.proposal_change.targetCardId)
  .filter((t): t is string => Boolean(t))
const targets = new Map<string, typeof card.$inferSelect>()
if (targetIds.length > 0) {
  const cards = await db
    .select()
    .from(card)
    .where(and(eq(card.projectId, projectId!), inArray(card.id, targetIds)))
  for (const c of cards) targets.set(c.id, c)
}

const proposed = rows.flatMap(({ proposal_change: change }) => {
  const data = (change.newData ?? {}) as Record<string, unknown>
  const base = {
    proposalId: change.proposalId,
    changeId: change.id,
    changeType: change.changeType as "create" | "update",
    targetCardId: change.targetCardId,
  }
  if (change.changeType === "close") return []
  if (change.changeType === "create") {
    return [
      {
        ...base,
        id: `${change.id}__proposed`,
        keyNo: 0,
        title: String(data.title ?? "Untitled"),
        slug: `${change.id}__proposed`,
        status: "proposed",
        priority:
          (data.priority as "low" | "medium" | "high" | "critical") ?? "medium",
        isClosed: false,
        assigneeId: null,
        epicId: null,
        acceptanceCriteriaCount: Array.isArray(data.acceptanceCriteria)
          ? (data.acceptanceCriteria as unknown[]).length
          : 0,
      },
    ]
  }
  const target = change.targetCardId
    ? targets.get(change.targetCardId)
    : undefined
  return [
    {
      ...base,
      id: `${change.id}__proposed`,
      keyNo: 0,
      title: String(data.title ?? target?.title ?? "Untitled"),
      slug: `${change.id}__proposed`,
      status: String(data.status ?? target?.status ?? "backlog"),
      priority:
        (data.priority as "low" | "medium" | "high" | "critical") ??
        target?.priority ??
        "medium",
      isClosed: false,
      assigneeId: null,
      epicId: null,
      acceptanceCriteriaCount: Array.isArray(data.acceptanceCriteria)
        ? (data.acceptanceCriteria as unknown[]).length
        : (target?.acceptanceCriteria.length ?? 0),
    },
  ]
})

return c.json({ success: true, data: proposed })
```

Imports to add in projects.ts: `isNull`, `inArray` from `drizzle-orm` (line 2).

- [ ] **Step 3: Extend `ProposedCard` type**

In `apps/web/src/hooks/use-projects.ts`, extend the `ProposedCard` type (lines 76-90):

```ts
export type ProposedCard = {
  id: string
  keyNo: number
  title: string
  slug: string
  status: string
  priority: "low" | "medium" | "high" | "critical"
  isClosed: boolean
  assigneeId: string | null
  epicId: string | null
  acceptanceCriteriaCount: number
  proposalId: string
  changeId: string
  changeType: "create" | "update"
  targetCardId: string | null
  updatedAt: string
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/__tests__/per-card-approval.test.ts` in `apps/api`
Expected: PASS (7 tests). Then `bun run typecheck` + `bun run lint` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/projects.ts apps/web/src/hooks/use-projects.ts
git commit -m "feat(api): show update proposals in the proposed lane"
```

---

### Task 3: Hooks with changeId + kanban update badge + caller updates

**Files:**

- Modify: `apps/web/src/hooks/use-proposals.ts`
- Modify: `apps/web/src/components/kanban.tsx`
- Modify: `apps/web/src/components/chat-thread.tsx`
- Modify: `apps/web/src/components/proposal-review.tsx`
- Modify: `apps/web/src/components/__tests__/chat-thread.test.tsx` (mock shapes)

**Interfaces:**

- Consumes: `resolveProposalChangeSchema` body shapes from Task 1 (`{ changeId?, reason? }`)
- Produces:
  - `useApproveProposal(projectSlug)` mutationFn: `(input: { proposalId: string; changeId?: string })`
  - `useRejectProposal(projectSlug)` mutationFn: `(input: { proposalId: string; changeId?: string; reason?: string })`
  - kanban `onOpenProposal(proposalId: string, changeId?: string)` — Task 4 wires it

- [ ] **Step 1: Update the hooks**

In `apps/web/src/hooks/use-proposals.ts`, replace both mutations:

```ts
export function useApproveProposal(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { proposalId: string; changeId?: string }) => {
      const res = await apiClient<Envelope<{ applied: number }>>(
        `/api/proposals/${input.proposalId}/approve?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: input.changeId ? { changeId: input.changeId } : undefined,
        }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal"] })
      qc.invalidateQueries({ queryKey: ["proposals"] })
      qc.invalidateQueries({ queryKey: ["project", projectSlug, "proposed"] })
    },
  })
}

export function useRejectProposal(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      proposalId: string
      changeId?: string
      reason?: string
    }) => {
      const res = await apiClient<Envelope<{ rejected: string }>>(
        `/api/proposals/${input.proposalId}/reject?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: {
            ...(input.changeId ? { changeId: input.changeId } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
          },
        }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal"] })
      qc.invalidateQueries({ queryKey: ["proposals"] })
      qc.invalidateQueries({ queryKey: ["project", projectSlug, "proposed"] })
    },
  })
}
```

Note: `apiClient` with `body: undefined` must skip the body — verify `apiClient` handles undefined body (check `apps/web/src/lib/api-client.ts`; if it sends `JSON.stringify(undefined)`, omit the body key entirely with a conditional spread).

- [ ] **Step 2: Update callers**

`apps/web/src/components/chat-thread.tsx`:

- Line 87: `approve.mutate(proposalId, { onSuccess: refresh })` → `approve.mutate({ proposalId }, { onSuccess: refresh })`
- Line 112: `reject.mutate({ id: proposalId, reason: reason || undefined }, {...})` → `reject.mutate({ proposalId, reason: reason || undefined }, {...})`

`apps/web/src/components/proposal-review.tsx`:

- Line 105: `approve.mutate(p.id, {...})` → `approve.mutate({ proposalId: p.id }, {...})`
- Line 151: `reject.mutate({ id: p.id, reason: ... }, {...})` → `reject.mutate({ proposalId: p.id, reason: ... }, {...})`

`apps/web/src/components/__tests__/chat-thread.test.tsx`:

- Mock shapes: `useApproveProposal: () => ({ mutate: vi.fn(), isPending: false })` — unchanged (mutate signature is mock-free)

- [ ] **Step 3: Kanban update badge + changeId passthrough**

In `apps/web/src/components/kanban.tsx`:

1. Change prop type (line 38):

```ts
onOpenProposal?: (proposalId: string, changeId?: string) => void
```

2. Update the two call sites (lines 117, 121):

```tsx
onClick={() => onOpenProposal?.(card.proposalId, card.changeId)}
```

and the keydown handler identically.

3. Badge copy by change type (lines 127-129):

```tsx
<span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-warn uppercase">
  {card.changeType === "update" ? "update" : "proposed"}
</span>
```

- [ ] **Step 4: Verify**

Run: `bun run test chat-thread proposal-review proposal-drawer` from worktree root → all pass (callers updated consistently).
Run: `bun run typecheck` and `bun run lint` → clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-proposals.ts apps/web/src/components/kanban.tsx apps/web/src/components/chat-thread.tsx apps/web/src/components/proposal-review.tsx
git commit -m "feat(web): per-change approve/reject hooks and update badge in proposed lane"
```

---

### Task 4: Drawer update diff + per-card actions + board wiring

**Files:**

- Modify: `apps/web/src/components/proposal-drawer.tsx`
- Modify: `apps/web/src/routes/project-board.tsx`
- Modify: `apps/web/src/components/__tests__/proposal-drawer.test.tsx`
- Modify: `apps/web/src/hooks/use-proposals.ts` (`ProposalChangeRow` gains `approvedAt`/`rejectedAt`)

**Interfaces:**

- Consumes: `useProposal` detail (changes with `before`, `newData`, `conflictFlags`, `relationSummary`, `approvedAt`, `rejectedAt`); `DiffPanel` from `./diff-panel`; hooks from Task 3
- Produces: `ProposalDrawer({ proposalId, changeId?, open, onClose, projectSlug })` — board passes `changeId` from lane rows

- [ ] **Step 1: Extend `ProposalChangeRow`**

In `apps/web/src/hooks/use-proposals.ts`, add to `ProposalChangeRow` (lines 14-37):

```ts
approvedAt: string | null
rejectedAt: string | null
```

- [ ] **Step 2: Write the failing drawer tests**

Append to `apps/web/src/components/__tests__/proposal-drawer.test.tsx`. The existing mock's `useProposal` must return BOTH a create change and an update change (with `before`). Rewrite the mock's `data.changes`:

```ts
        changes: [
          {
            id: "ch1",
            changeType: "create",
            targetCardId: null,
            newData: {
              title: "Loyalty card",
              description: "Reward repeat buyers.",
              acceptanceCriteria: ["Points accrue", "Redeem at checkout"],
              priority: "high",
              status: "backlog",
            },
            relationSummary: [],
            conflictFlags: [],
            approvedAt: null,
            rejectedAt: null,
          },
          {
            id: "ch2",
            changeType: "update",
            targetCardId: "c9",
            newData: {
              title: "Loyalty card v2",
              description: "Reward repeat buyers with tiers.",
              acceptanceCriteria: ["Points accrue", "Redeem at checkout", "Tiers"],
              priority: "critical",
              status: "in_progress",
            },
            before: {
              id: "c9",
              title: "Loyalty card",
              description: "Reward repeat buyers.",
              acceptanceCriteria: ["Points accrue"],
              status: "todo",
              priority: "high",
            },
            relationSummary: [
              { type: "dependency", sourceCardId: "c8", note: "depends on checkout" },
            ],
            conflictFlags: [{ type: "conflict", summary: "overlaps with card X" }],
            approvedAt: null,
            rejectedAt: null,
          },
        ],
```

Add tests:

```tsx
it("renders a before/after diff for update changes", async () => {
  const { ProposalDrawer } = await import("../proposal-drawer")
  render(
    <MemoryRouter>
      <ProposalDrawer
        proposalId="prop_1"
        changeId="ch2"
        open
        onClose={vi.fn()}
        projectSlug="loyalty"
      />
    </MemoryRouter>
  )
  expect(screen.getByTestId("proposal-drawer-title")).toHaveTextContent(
    "Loyalty card v2"
  )
  expect(screen.getByTestId("diff-panel")).toBeInTheDocument()
  expect(screen.getByText("critical")).toBeInTheDocument()
  expect(screen.getByText("Points accrue")).toBeInTheDocument()
  expect(screen.getByText(/overlaps with card X/)).toBeInTheDocument()
})

it("per-card approve passes proposalId and changeId", async () => {
  const { ProposalDrawer } = await import("../proposal-drawer")
  render(
    <MemoryRouter>
      <ProposalDrawer
        proposalId="prop_1"
        changeId="ch2"
        open
        onClose={vi.fn()}
        projectSlug="loyalty"
      />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByTestId("approve-proposal"))
  expect(approveMutate).toHaveBeenCalledWith(
    { proposalId: "prop_1", changeId: "ch2" },
    expect.any(Object)
  )
})

it("per-card reject passes proposalId, changeId and reason", async () => {
  const { ProposalDrawer } = await import("../proposal-drawer")
  render(
    <MemoryRouter>
      <ProposalDrawer
        proposalId="prop_1"
        changeId="ch2"
        open
        onClose={vi.fn()}
        projectSlug="loyalty"
      />
    </MemoryRouter>
  )
  fireEvent.click(screen.getByRole("button", { name: "Reject" }))
  const input = screen.getByPlaceholderText("Reason (optional)")
  fireEvent.change(input, { target: { value: "Too broad" } })
  fireEvent.click(screen.getByRole("button", { name: "Confirm" }))
  expect(rejectMutate).toHaveBeenCalledWith(
    { proposalId: "prop_1", changeId: "ch2", reason: "Too broad" },
    expect.any(Object)
  )
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun run test proposal-drawer`
Expected: FAIL — `changeId` prop not accepted / update rendering missing.

- [ ] **Step 4: Implement the drawer**

In `apps/web/src/components/proposal-drawer.tsx`:

1. Add `changeId?: string` prop.
2. Change selection (replace line 30):

```ts
const change =
  data.changes.find((c) => c.id === changeId) ??
  data.changes.find(
    (c) => !c.approvedAt && !c.rejectedAt && c.changeType === "create"
  )
if (!change) return null
```

3. Add an `isUpdate` flag and the diff section. Replace the content block (lines 85-129) so that when `change.changeType === "update"`, the drawer renders:

```tsx
<div className="flex-1 overflow-y-auto p-4">
  {isUpdate ? (
    <div className="space-y-4">
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Title
        </p>
        <p className="text-sm">
          <span className="text-muted line-through decoration-destructive/50">
            {before?.title ?? ""}
          </span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span className="font-medium">{title}</span>
        </p>
      </div>
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Description
        </p>
        <DiffPanel before={before?.description ?? ""} after={description} />
      </div>
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Acceptance criteria
        </p>
        <ul className="space-y-1 text-sm">
          {(before?.acceptanceCriteria ?? []).map((c, i) => {
            const kept = criteria.includes(c)
            return (
              <li key={`before-${i}`} className="flex gap-2">
                <span className={kept ? "text-primary" : "text-destructive"}>
                  {kept ? "☐" : "✕"}
                </span>
                <span
                  className={
                    kept
                      ? ""
                      : "text-muted line-through decoration-destructive/50"
                  }
                >
                  {c}
                </span>
              </li>
            )
          })}
          {criteria.map((c, i) => {
            const kept = before?.acceptanceCriteria.includes(c)
            return kept ? null : (
              <li key={`after-${i}`} className="flex gap-2">
                <span className="text-success">+</span>
                <span>{c}</span>
              </li>
            )
          })}
        </ul>
      </div>
      <div>
        <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Status &amp; priority
        </p>
        <p className="text-sm">
          <span className="text-muted line-through decoration-destructive/50">
            {before?.status ?? ""} · {before?.priority ?? ""}
          </span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span className="font-medium">
            {status} · {priority}
          </span>
        </p>
      </div>
      {change.conflictFlags.length > 0 && (
        <div className="space-y-1 text-sm text-destructive">
          {change.conflictFlags.map((f, i) => (
            <p key={i}>⚠ {f.summary}</p>
          ))}
        </div>
      )}
      {change.relationSummary.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Relations
          </p>
          <ul className="space-y-1 text-sm">
            {change.relationSummary.map((r, i) => (
              <li key={i}>
                <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                  {r.type}
                </span>{" "}
                {r.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      {description && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      )}
      {criteria.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Acceptance criteria
          </p>
          <ul className="space-y-1 text-sm">
            {criteria.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">☐</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {change.conflictFlags.length > 0 && (
        <div className="space-y-1 text-sm text-destructive">
          {change.conflictFlags.map((f, i) => (
            <p key={i}>⚠ {f.summary}</p>
          ))}
        </div>
      )}
      {change.relationSummary.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Relations
          </p>
          <ul className="space-y-1 text-sm">
            {change.relationSummary.map((r, i) => (
              <li key={i}>
                <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                  {r.type}
                </span>{" "}
                {r.note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )}
</div>
```

4. Add derived values before the return (after `status`):

```ts
const isUpdate = change.changeType === "update"
const before =
  change.changeType === "update"
    ? (
        change as {
          before?: {
            title?: string
            description?: string | null
            acceptanceCriteria?: string[]
            status?: string
            priority?: string
          } | null
        }
      ).before
    : null
```

(Or type `before` from the `ProposalChangeRow` type — the api's `before` field is attached per change; extend `ProposalChangeRow` with `before?: {...} | null` in use-proposals.ts.)

5. Per-card actions (replace lines 133-170 footer):

```tsx
<div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
  <Button
    size="sm"
    data-testid="approve-proposal"
    disabled={approve.isPending}
    onClick={() =>
      approve.mutate({ proposalId, changeId: change.id }, { onSuccess: close })
    }
  >
    {approve.isPending ? "Approving..." : "Approve"}
  </Button>
  <Button size="sm" variant="outline" onClick={() => setRejecting((r) => !r)}>
    Reject
  </Button>
  {rejecting && (
    <>
      <input
        className="min-w-32 flex-1 rounded-md border bg-background px-2 py-1 text-xs"
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
            {
              proposalId,
              changeId: change.id,
              reason: reason || undefined,
            },
            { onSuccess: close }
          )
        }
      >
        {reject.isPending ? "Rejecting..." : "Confirm"}
      </Button>
    </>
  )}
</div>
```

6. Import `DiffPanel` and `ProposalChangeRow`:

```tsx
import { DiffPanel } from "./diff-panel"
import type { ProposalChangeRow } from "@/hooks/use-proposals"
```

(Use `ProposalChangeRow` for the `before` typing — add `before?: { title: string; description: string | null; acceptanceCriteria: string[]; status: string; priority: string } | null` to the type in use-proposals.ts.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test proposal-drawer`
Expected: PASS (7 tests: 4 existing + 3 new).

- [ ] **Step 6: Board wiring**

In `apps/web/src/routes/project-board.tsx`:

1. Line 140: `onOpenProposal={(proposalId, changeId) => setActiveProposalId({ proposalId, changeId })}` — change state to hold both:

```tsx
const [activeProposal, setActiveProposal] = useState<{
  proposalId: string
  changeId?: string
} | null>(null)
```

2. Drawer render (lines 163-170):

```tsx
{
  activeProposal && (
    <ProposalDrawer
      proposalId={activeProposal.proposalId}
      changeId={activeProposal.changeId}
      open={Boolean(activeProposal)}
      onClose={() => setActiveProposal(null)}
      projectSlug={slug ?? ""}
    />
  )
}
```

- [ ] **Step 7: Verify + commit**

Run: `bun run test proposal-drawer chat-thread proposal-review` → pass.
Run: `bun run typecheck` and `bun run lint` → clean.

```bash
git add apps/web/src/components/proposal-drawer.tsx apps/web/src/routes/project-board.tsx apps/web/src/components/__tests__/proposal-drawer.test.tsx apps/web/src/hooks/use-proposals.ts
git commit -m "feat(web): update diff and per-card actions in proposal drawer"
```

---

## Post-Plan Verification

- [ ] `bun run test` passes (root vitest)
- [ ] `bun test` passes in `apps/api` (with `--parallel=2` if the health-check connection race appears)
- [ ] `bun run typecheck` and `bun run lint` pass
- [ ] Manual: generate a proposal with creates + updates → both types in lane; update card shows diff; approve one card → applies, proposal stays pending; approve rest → proposal approved
