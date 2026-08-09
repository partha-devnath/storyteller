# Proposed Card Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a proposed card on the board opens a right sidebar (drawer) showing the proposed card content with approve/reject actions, instead of navigating to the proposals page.

**Architecture:** New `ProposalDrawer` component (mirrors `CardDrawer` shell) fed by the existing `useProposal` hook. Board page swaps `navigate()` for local drawer state. Approve/reject mutations get extended query invalidation so the Proposed lane refreshes without a page reload.

**Tech Stack:** React 19, React Router, TanStack React Query, Vitest + Testing Library, shadcn/ui `Button`, `ReactMarkdown`.

## Global Constraints

- Named exports only — no default exports
- No comments in code unless asked
- Run `bun run typecheck` and `bun run lint` before each commit; commit messages follow Conventional Commits
- Tests live in `__tests__/` next to source (e.g. `src/components/__tests__/`)
- Web tests run with Vitest (not `bun test`): `bun --filter @workspace/web test`
- Drawer styling must match `CardDrawer` (fixed inset-0 z-50 flex justify-end, overlay `bg-black/60 backdrop-blur-sm`, panel `max-w-xl border-l border-input bg-background shadow-2xl`)

---

### Task 1: Extend approve/reject invalidation to refresh the Proposed lane

**Files:**

- Modify: `apps/web/src/hooks/use-proposals.ts:75-107`
- Test: none (invalidations are exercised by Task 2's component test via mocked hooks; verified by typecheck + full suite)

**Interfaces:**

- Consumes: `useApproveProposal(projectSlug: string)`, `useRejectProposal(projectSlug: string)` — both already exist with `queryClient` in scope
- Produces: approve/reject `onSuccess` also invalidates `["project", projectSlug, "proposed"]` — Task 2's drawer relies on the lane disappearing after action without reload

- [ ] **Step 1: Add invalidation to `useApproveProposal`**

In `apps/web/src/hooks/use-proposals.ts`, change the `onSuccess` of `useApproveProposal` (currently lines 85-89):

```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["proposal"] })
  qc.invalidateQueries({ queryKey: ["proposals"] })
  qc.invalidateQueries({ queryKey: ["project", projectSlug, "proposed"] })
},
```

- [ ] **Step 2: Add invalidation to `useRejectProposal`**

Change the `onSuccess` of `useRejectProposal` (currently lines 102-105):

```ts
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ["proposal"] })
  qc.invalidateQueries({ queryKey: ["proposals"] })
  qc.invalidateQueries({ queryKey: ["project", projectSlug, "proposed"] })
},
```

- [ ] **Step 3: Verify**

Run: `bun run typecheck` and `bun run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-proposals.ts
git commit -m "fix(web): invalidate proposed lane after proposal approve/reject"
```

---

### Task 2: `ProposalDrawer` component

**Files:**

- Create: `apps/web/src/components/proposal-drawer.tsx`
- Test: `apps/web/src/components/__tests__/proposal-drawer.test.tsx`

**Interfaces:**

- Consumes: `useProposal(id: string | undefined, projectSlug?: string)` → `{ data: ProposalDetail | undefined }` where `ProposalDetail = { proposal: {...}, changes: ProposalChangeRow[] }`; `useApproveProposal(projectSlug)` → `{ mutate: (id, opts), isPending }`; `useRejectProposal(projectSlug)` → `{ mutate: ({id, reason?}, opts), isPending }`. `ProposalChangeRow.changeType: "create" | "update" | "close"`, fields `newData: Record<string, unknown>`, `conflictFlags: {type, summary}[]`, `relationSummary: {type, note}[]`. All defined in `apps/web/src/hooks/use-proposals.ts`.
- Produces: named export `ProposalDrawer({ proposalId: string, open: boolean, onClose: () => void, projectSlug: string })` — Task 3 renders it in `project-board.tsx`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/components/__tests__/proposal-drawer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const { approveMutate, rejectMutate } = vi.hoisted(() => ({
  approveMutate: vi.fn(),
  rejectMutate: vi.fn(),
}))

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
          newData: {
            title: "Loyalty card",
            description: "Reward repeat buyers.",
            acceptanceCriteria: ["Points accrue", "Redeem at checkout"],
            priority: "high",
            status: "backlog",
          },
          relationSummary: [
            {
              type: "dependency",
              sourceCardId: "c9",
              note: "depends on checkout",
            },
          ],
          conflictFlags: [
            { type: "conflict", summary: "overlaps with card X" },
          ],
        },
      ],
    },
  }),
  useApproveProposal: () => ({ mutate: approveMutate, isPending: false }),
  useRejectProposal: () => ({ mutate: rejectMutate, isPending: false }),
}))

describe("ProposalDrawer", () => {
  async function renderDrawer() {
    const { ProposalDrawer } = await import("../proposal-drawer")
    return render(
      <MemoryRouter>
        <ProposalDrawer
          proposalId="prop_1"
          open
          onClose={vi.fn()}
          projectSlug="loyalty"
        />
      </MemoryRouter>
    )
  }

  it("renders proposed card title, description and criteria", async () => {
    await renderDrawer()
    expect(screen.getByTestId("proposal-drawer-title")).toHaveTextContent(
      "Loyalty card"
    )
    expect(screen.getByText("Reward repeat buyers.")).toBeInTheDocument()
    expect(screen.getByText("Points accrue")).toBeInTheDocument()
    expect(screen.getByText("Redeem at checkout")).toBeInTheDocument()
  })

  it("shows conflict flags and relation notes", async () => {
    await renderDrawer()
    expect(screen.getByText(/overlaps with card X/)).toBeInTheDocument()
    expect(screen.getByText("dependency")).toBeInTheDocument()
    expect(screen.getByText(/depends on checkout/)).toBeInTheDocument()
  })

  it("approve button calls approve mutation", async () => {
    await renderDrawer()
    fireEvent.click(screen.getByTestId("approve-proposal"))
    expect(approveMutate).toHaveBeenCalledWith("prop_1", expect.any(Object))
  })

  it("reject flow shows reason input and confirms", async () => {
    await renderDrawer()
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    const input = screen.getByPlaceholderText("Reason (optional)")
    fireEvent.change(input, { target: { value: "Too broad" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))
    expect(rejectMutate).toHaveBeenCalledWith(
      { id: "prop_1", reason: "Too broad" },
      expect.any(Object)
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun --filter @workspace/web test proposal-drawer`
Expected: FAIL — module `../proposal-drawer` not found.

- [ ] **Step 3: Write the component**

Create `apps/web/src/components/proposal-drawer.tsx`:

```tsx
import { useState } from "react"
import { Link } from "react-router"
import ReactMarkdown from "react-markdown"
import {
  useProposal,
  useApproveProposal,
  useRejectProposal,
} from "@/hooks/use-proposals"
import { Button, buttonVariants } from "@workspace/ui/components/button"

export function ProposalDrawer({
  proposalId,
  open,
  onClose,
  projectSlug,
}: {
  proposalId: string
  open: boolean
  onClose: () => void
  projectSlug: string
}) {
  const { data } = useProposal(open ? proposalId : undefined, projectSlug)
  const approve = useApproveProposal(projectSlug)
  const reject = useRejectProposal(projectSlug)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  if (!open || !data) return null

  const change = data.changes.find((c) => c.changeType === "create")
  if (!change) return null

  const newData = change.newData as Record<string, unknown>
  const title = String(newData.title ?? "Untitled")
  const description = String(newData.description ?? "")
  const criteria = Array.isArray(newData.acceptanceCriteria)
    ? (newData.acceptanceCriteria as string[])
    : []
  const priority = String(newData.priority ?? "medium")
  const status = String(newData.status ?? "backlog")

  function close() {
    setRejecting(false)
    setReason("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-input bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn uppercase">
                proposed
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {priority} · {status}
              </span>
            </div>
            <p
              className="mt-1 text-lg leading-snug font-bold tracking-tight"
              data-testid="proposal-drawer-title"
            >
              {title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/projects/${projectSlug}/proposals?proposal=${proposalId}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open in chat
            </Link>
            <Button size="sm" variant="ghost" onClick={close}>
              ✕
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          )}
          {criteria.length > 0 && (
            <div className="mt-4">
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
            <div className="mt-4 space-y-1 text-sm text-destructive">
              {change.conflictFlags.map((f, i) => (
                <p key={i}>⚠ {f.summary}</p>
              ))}
            </div>
          )}
          {change.relationSummary.length > 0 && (
            <div className="mt-4">
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

        <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
          <Button
            size="sm"
            data-testid="approve-proposal"
            disabled={approve.isPending}
            onClick={() => approve.mutate(proposalId, { onSuccess: close })}
          >
            {approve.isPending ? "Approving..." : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejecting((r) => !r)}
          >
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
                    { id: proposalId, reason: reason || undefined },
                    { onSuccess: close }
                  )
                }
              >
                {reject.isPending ? "Rejecting..." : "Confirm"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun --filter @workspace/web test proposal-drawer`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify + commit**

Run: `bun run typecheck` and `bun run lint`
Expected: no errors.

```bash
git add apps/web/src/components/proposal-drawer.tsx apps/web/src/components/__tests__/proposal-drawer.test.tsx
git commit -m "feat(web): proposal drawer for proposed cards on board"
```

---

### Task 3: Wire drawer into board page

**Files:**

- Modify: `apps/web/src/routes/project-board.tsx:32-60, 132-164`
- Test: none — board page has no test harness; verified by typecheck, lint, and manual check (existing tests cover the drawer itself)

**Interfaces:**

- Consumes: `ProposalDrawer` from Task 2 (named export, props `{ proposalId, open, onClose, projectSlug }`)
- Produces: board page renders drawer when a proposed card is clicked; no URL navigation

- [ ] **Step 1: Add state and replace navigation**

In `apps/web/src/routes/project-board.tsx`:

1. Add import after the `CardDrawer` import (line 12):

```tsx
import { ProposalDrawer } from "@/components/proposal-drawer"
```

2. Add state next to `activeCardId` (line 50):

```tsx
const [activeProposalId, setActiveProposalId] = useState<string | null>(null)
```

3. Replace the `onOpenProposal` handler (lines 139-143):

```tsx
onOpenProposal={(proposalId) => setActiveProposalId(proposalId)}
```

4. If `useNavigate` (line 34) is now unused elsewhere in the file, remove it from the import. Grep the file for `navigate(` first — it is only used in that handler, so remove `useNavigate` from the `react-router` import (line 2).

5. Render the drawer next to the existing `CardDrawer` block (after line 164):

```tsx
{
  activeProposalId && (
    <ProposalDrawer
      proposalId={activeProposalId}
      open={Boolean(activeProposalId)}
      onClose={() => setActiveProposalId(null)}
      projectSlug={slug ?? ""}
    />
  )
}
```

- [ ] **Step 2: Verify**

Run: `bun run typecheck` and `bun run lint`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run: `bun dev`
Expected: on the board, clicking a proposed card opens the sidebar (proposed badge, title, description, criteria, warnings, relations, approve/reject, "Open in chat" link). Clicking Approve closes the drawer, the lane entry disappears, and the card appears on the board (via SSE refresh). No URL change occurs.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/project-board.tsx
git commit -m "feat(web): open proposal drawer instead of navigating on proposed card click"
```

---

## Post-Plan Verification

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun --filter @workspace/web test` passes (full web suite)
- [ ] Manual: proposed card → drawer, approve/reject works, no navigation
