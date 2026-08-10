# UX Polish Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 12 selected UX/design/performance improvements from the three-agent audit of the storyteller web app.

**Architecture:** Pure frontend batch in `apps/web` + `packages/ui`. Each task touches 1-4 files, isolated changes, own test cycle, own commit. No API changes, no schema changes.

**Tech Stack:** React 19, Vite, shadcn/ui (@workspace/ui), Tailwind v4, TanStack React Query, React Router, vitest.

## Global Constraints

- No default exports — named exports only
- Tests live in `src/__tests__/` next to source (e.g. `apps/web/src/components/__tests__/`); `apps/web` uses vitest
- Commits: Conventional Commits, one logical change per commit
- Run `bun --filter web test` after each task; `bun run typecheck && bun run lint` before finishing
- Use `@workspace/ui` components instead of raw elements where they exist
- "Closed" is the canonical term for frozen cards (terminology task)
- Do NOT touch: chat optimistic updates, SSE throttling, landing gradients, drawer → base-ui Sheet swap, tab consolidation (explicitly rejected)

---

### Task 1: Usage meter near-limit color

**Files:**

- Modify: `apps/web/src/components/usage-meters.tsx:54-58,96-99`
- Test: `apps/web/src/components/__tests__/usage-meters.test.tsx:75,90`

**Interfaces:** none changed.

- [x] **Step 1: Update failing tests**

In `usage-meters.test.tsx`, change the two `toHaveClass("bg-chart-1")` assertions (lines ~75, ~90) to `toHaveClass("bg-warn")`.

- [x] **Step 2: Run tests, verify they fail**

Run: `bun --filter web test -- usage-meters`
Expected: FAIL on the two bg-chart-1 assertions.

- [x] **Step 3: Fix the component**

In `usage-meters.tsx`, replace `bg-chart-1` with `bg-warn` at line 57 (fill) and line 97 (`text-chart-1` → `text-warn` for the near-limit note).

- [x] **Step 4: Run tests, verify pass**

Run: `bun --filter web test -- usage-meters`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/components/usage-meters.tsx apps/web/src/components/__tests__/usage-meters.test.tsx
git commit -m "fix(web): use warn token for near-limit usage meters"
```

### Task 2: Chip legibility — text-[9px] → text-[11px]

**Files:**

- Modify: `apps/web/src/components/kanban.tsx:129`, `apps/web/src/components/graph-node.tsx:73,82`, `apps/web/src/components/chat-thread.tsx:185,377`

**Interfaces:** none.

- [x] **Step 1: Replace**

In each listed line, change `text-[9px]` to `text-[11px]`.

- [x] **Step 2: Run web tests**

Run: `bun --filter web test`
Expected: PASS (no assertions on 9px).

- [x] **Step 3: Commit**

```bash
git add apps/web/src/components/kanban.tsx apps/web/src/components/graph-node.tsx apps/web/src/components/chat-thread.tsx
git commit -m "style(web): bump chip font size to 11px for legibility"
```

### Task 3: Replace raw inputs with @workspace/ui Input

**Files:**

- Modify: `apps/web/src/components/board-toolbar.tsx:24-30`, `apps/web/src/components/chat-thread.tsx:102-108`, `apps/web/src/components/app-shell.tsx:147-151`

**Interfaces:** none.

- [x] **Step 1: board-toolbar.tsx**

Replace the raw `<input>` (lines 24-30) with:

```tsx
<Input
  aria-label="Filter cards"
  placeholder="Filter cards by title…"
  value={filters.query}
  onChange={(e) => onChange({ ...filters, query: e.target.value })}
  className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
/>
```

Add import: `import { Input } from "@workspace/ui/components/input"`.

- [x] **Step 2: chat-thread.tsx reject-reason input**

Replace raw `<input data-testid="reject-reason">` (lines 102-108) with:

```tsx
<Input
  data-testid="reject-reason"
  className="w-40"
  placeholder="Reason (optional)"
  value={reason}
  onChange={(e) => setReason(e.target.value)}
/>
```

Add import for `Input`.

- [x] **Step 3: app-shell.tsx global search input**

Replace raw `<input aria-label="Global search">` (lines 147-151) with:

```tsx
<Input
  ref={searchRef}
  aria-label="Global search"
  placeholder="Search cards, keys, versions…"
  className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
/>
```

Add import for `Input` and declare `const searchRef = useRef<HTMLInputElement | null>(null)` (see Task 9 Step 2 for the Ctrl+K wiring).

- [x] **Step 4: Run web tests + typecheck**

Run: `bun --filter web test && bun run typecheck`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/components/board-toolbar.tsx apps/web/src/components/chat-thread.tsx apps/web/src/components/app-shell.tsx
git commit -m "refactor(web): use ui Input component for raw inputs"
```

### Task 4: Resend verification email button

**Files:**

- Modify: `apps/web/src/routes/verify-email.tsx`
- Test: `apps/web/src/routes/__tests__/verify-email.test.tsx`

**Interfaces:**

- Consumes: `sendVerificationEmail` from `@/lib/auth-client` (already exported), `useSession` from `@/lib/auth-client`
- Produces: no new exports

- [x] **Step 1: Write failing test**

In `verify-email.test.tsx`, add a test: renders "Resend email" button when no token; clicking calls `sendVerificationEmail` with the session user's email (mock `useSession` to return `{ data: { user: { email: "a@b.com" } } }`); after click shows "Verification email sent" text.

- [x] **Step 2: Run test, verify it fails**

Run: `bun --filter web test -- verify-email`
Expected: FAIL — button not found.

- [x] **Step 3: Implement**

In `verify-email.tsx`:

```tsx
import { sendVerificationEmail, useSession } from "@/lib/auth-client"

const { data: session } = useSession()
const email = session?.user?.email
const [resent, setResent] = useState(false)
const [resending, setResending] = useState(false)
const [resendError, setResendError] = useState<string | null>(null)

async function handleResend() {
  if (!email) return
  setResending(true)
  setResendError(null)
  try {
    const result = await sendVerificationEmail({ email })
    if (result.error) {
      setResendError(result.error.message ?? "Failed to resend")
      return
    }
    setResent(true)
  } catch {
    setResendError("An unexpected error occurred")
  } finally {
    setResending(false)
  }
}
```

In the no-token branch (line 75-82), add after the "Back to login" Link:

```tsx
;<Button
  variant="outline"
  size="sm"
  onClick={handleResend}
  disabled={resending || resent}
>
  {resending
    ? "Sending..."
    : resent
      ? "Verification email sent"
      : "Resend email"}
</Button>
{
  resendError && <p className="text-sm text-destructive">{resendError}</p>
}
```

- [x] **Step 4: Run test, verify pass**

Run: `bun --filter web test -- verify-email`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/routes/verify-email.tsx apps/web/src/routes/__tests__/verify-email.test.tsx
git commit -m "feat(web): add resend verification email button"
```

### Task 5: Drawer Escape-to-close, focus, entrance animation, loading skeleton

**Files:**

- Modify: `apps/web/src/components/card-drawer.tsx`, `apps/web/src/components/proposal-drawer.tsx`
- Test: `apps/web/src/components/__tests__/card-drawer.test.tsx`

**Interfaces:** none.

- [x] **Step 1: Write failing tests (card-drawer)**

Add to `card-drawer.test.tsx`:

1. Esc keydown while open calls `onClose`.
2. Drawer panel has `role="dialog"` and `aria-modal="true"`.

- [x] **Step 2: Run tests, verify they fail**

Run: `bun --filter web test -- card-drawer`
Expected: FAIL.

- [x] **Step 3: Implement in card-drawer.tsx**

Add effect (mount-level, always active while mounted — guard with `open`):

```tsx
useEffect(() => {
  if (!open) return
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") onClose()
  }
  window.addEventListener("keydown", onKey)
  return () => window.removeEventListener("keydown", onKey)
}, [open, onClose])
```

Panel div (line 117): add `role="dialog" aria-modal="true" tabIndex={-1}` and animation classes `animate-in fade-in slide-in-from-right-6 duration-200` (tailwindcss-animate is available — dialog.tsx uses data-open, plain animate-in works on mount). Backdrop (line 114): add `animate-in fade-in duration-150`.

Skeleton: replace `if (!open || !detail) return null` (line 83) with:

```tsx
if (!open) return null
if (!detail) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-xl flex-col gap-4 border-l border-input bg-background p-5 shadow-2xl">
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
```

- [x] **Step 4: Implement in proposal-drawer.tsx**

Same Esc effect (dependency `open`, `close`), same `role="dialog" aria-modal="true" tabIndex={-1}` + animate-in classes on panel, `animate-in fade-in` on backdrop. Leave the `if (!open || !data) return null` guard (data loads fast; skeleton optional here).

- [x] **Step 5: Run tests + typecheck**

Run: `bun --filter web test && bun run typecheck`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/web/src/components/card-drawer.tsx apps/web/src/components/proposal-drawer.tsx apps/web/src/components/__tests__/card-drawer.test.tsx
git commit -m "feat(web): drawer escape close, focus semantics, animation, loading skeleton"
```

### Task 6: Close-card confirmation dialog

**Files:**

- Modify: `apps/web/src/components/card-drawer.tsx`
- Test: `apps/web/src/components/__tests__/card-drawer.test.tsx`

**Interfaces:** none.

- [x] **Step 1: Write failing test**

In `card-drawer.test.tsx`: clicking "Close card" button opens a dialog with "Close this card?" title and a "Confirm" button; clicking Confirm calls the close mutation (assert via the mutation mock). Dialog text includes "permanently read-only".

- [x] **Step 2: Run test, verify it fails**

Run: `bun --filter web test -- card-drawer`
Expected: FAIL.

- [x] **Step 3: Implement**

In `card-drawer.tsx` add `const [confirmClose, setConfirmClose] = useState(false)`. Change the "Close card" button (line 150-158) `onClick` to `setConfirmClose(true)`. Add at the end of the returned JSX (inside the outer fixed container is fine — Dialog portals anyway):

```tsx
<Dialog open={confirmClose} onOpenChange={setConfirmClose}>
  <DialogContent data-testid="close-card-confirm">
    <DialogHeader>
      <DialogTitle>Close this card?</DialogTitle>
      <DialogDescription>
        The card becomes permanently read-only. This cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setConfirmClose(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        disabled={closeCard.isPending}
        onClick={() => {
          setConfirmClose(false)
          closeCard.mutate({ cardId: card.id })
        }}
      >
        {closeCard.isPending ? "Closing..." : "Confirm"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Add imports: `Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle` from `@workspace/ui/components/dialog`.

- [x] **Step 4: Run tests, verify pass**

Run: `bun --filter web test -- card-drawer`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/components/card-drawer.tsx apps/web/src/components/__tests__/card-drawer.test.tsx
git commit -m "feat(web): confirm dialog before closing a card"
```

### Task 7: New-board required error, landing footer dead links, decorative bell

**Files:**

- Modify: `apps/web/src/routes/projects.tsx:52,160-168`, `apps/web/src/routes/landing.tsx:534-553`, `apps/web/src/components/app-shell.tsx:157-166`

- [x] **Step 1: projects.tsx — show name required error**

Change `useForm<CreateForm>()` (line 52) to:

```tsx
const {
  register,
  handleSubmit,
  reset,
  formState: { errors },
} = useForm<CreateForm>()
```

Change the register call (line 163):

```tsx
<Input
  id="name"
  aria-invalid={Boolean(errors.name)}
  {...register("name", { required: "Name is required" })}
/>
```

Add after the Input (inside the `space-y-1` div):

```tsx
{
  errors.name && (
    <p className="text-xs text-destructive">{errors.name.message}</p>
  )
}
```

- [x] **Step 2: landing.tsx — remove dead legal links**

Delete the Legal `<div>` (lines 533-553) containing the three `href="#features"` anchors. Keep the "Product" column.

- [x] **Step 3: app-shell.tsx — remove decorative bell**

Delete the notification button block (lines 158-164) and the `Bell` import from the lucide import on line 13.

- [x] **Step 4: Run web tests**

Run: `bun --filter web test`
Expected: PASS (fix any test asserting the bell/footer links if present).

- [x] **Step 5: Commit**

```bash
git add apps/web/src/routes/projects.tsx apps/web/src/routes/landing.tsx apps/web/src/components/app-shell.tsx
git commit -m "fix(web): surface board-name validation, remove dead links and decorative bell"
```

### Task 8: Optimistic card move + memoized board components

**Files:**

- Modify: `apps/web/src/hooks/use-cards.ts:196-208`, `apps/web/src/components/kanban.tsx`, `apps/web/src/components/board-column.tsx`, `apps/web/src/components/board-card.tsx`, `apps/web/src/routes/project-board.tsx:141`
- Test: `apps/web/src/components/__tests__/board-card.test.tsx` (frozen label, see Task 11)

**Interfaces:**

- Consumes: `useCards` query key `["project", projectSlug, "cards"]`
- Produces: `useMoveCard` now updates the cache optimistically

- [x] **Step 1: Optimistic useMoveCard**

In `use-cards.ts`, rewrite `useMoveCard`:

```tsx
export function useMoveCard(projectSlug: string) {
  const qc = useQueryClient()
  const queryKey = ["project", projectSlug, "cards"] as const
  return useMutation({
    mutationFn: async (input: { cardId: string; status: string }) => {
      const res = await apiClient<Envelope<{ id: string }>>(
        `/api/cards/${input.cardId}?project=${encodeURIComponent(projectSlug)}`,
        { method: "PATCH", body: { status: input.status } }
      )
      return res.data
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey })
      const previous = qc.getQueryData<BoardCard[]>(queryKey)
      qc.setQueryData<BoardCard[]>(queryKey, (old) =>
        old?.map((c) =>
          c.id === input.cardId ? { ...c, status: input.status } : c
        )
      )
      return { previous }
    },
    onError: (_err, _input, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project"] }),
  })
}
```

- [x] **Step 2: Memoize components**

In `board-card.tsx`: wrap component in `React.memo` — change to `export const BoardCard = memo(function BoardCard(...) { ... })` (add `import { memo } from "react"`). Same for `BoardColumn` in `board-column.tsx` and `DraggableBoardCard` in `board-column.tsx`.

In `kanban.tsx`: wrap `matchesFilters` and `proposedMatches` in `useCallback` with `[filters]` dep (add `import { useCallback } from "react"`).

In `project-board.tsx` line 141: wrap the `onMove` and `onSelectCard` callbacks in `useCallback` (add import) so memoized children get stable props.

- [x] **Step 3: Run tests + typecheck**

Run: `bun --filter web test && bun run typecheck`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-cards.ts apps/web/src/components/kanban.tsx apps/web/src/components/board-column.tsx apps/web/src/components/board-card.tsx apps/web/src/routes/project-board.tsx
git commit -m "perf(web): optimistic card moves and memoized board components"
```

### Task 9: Card-detail skeleton, Ctrl+K focus, onboarding persistence, card transition

**Files:**

- Modify: `apps/web/src/routes/card-detail.tsx:54-66`, `apps/web/src/components/app-shell.tsx`, `apps/web/src/hooks/use-onboarding.ts:16,21`, `apps/web/src/components/board-card.tsx:38`

- [x] **Step 1: card-detail.tsx — loading skeleton vs 404**

Replace the `if (!detail)` block (lines 54-66) with:

```tsx
const { isLoading } = useCardDetail(cardSlug, slug)

if (isLoading) {
  return (
    <div className="space-y-4 p-6" data-testid="card-detail-loading">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  )
}

if (!detail) {
  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <p className="text-sm text-muted-foreground">Card not found.</p>
      <Link
        to={`/projects/${slug ?? ""}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Back to board
      </Link>
    </div>
  )
}
```

- [x] **Step 2: app-shell.tsx — Ctrl+K focuses search**

Add `import { useEffect, useRef } from "react"` (currently `useEffect` only), `const searchRef = useRef<HTMLInputElement | null>(null)`, and:

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault()
      searchRef.current?.focus()
    }
  }
  window.addEventListener("keydown", onKey)
  return () => window.removeEventListener("keydown", onKey)
}, [])
```

Wire `ref={searchRef}` on the search Input (Task 3 Step 3).

- [x] **Step 3: use-onboarding.ts — persist skip in localStorage**

Change `window.sessionStorage` → `window.localStorage` in `isOnboardingSkipped` (line 16) and `dismissOnboarding` (line 21).

- [x] **Step 4: board-card.tsx — scope transition**

Line 38: change `transition-all duration-150` to `transition-[transform,box-shadow,border-color,opacity] duration-150`.

- [x] **Step 5: Run tests + typecheck**

Run: `bun --filter web test && bun run typecheck`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/web/src/routes/card-detail.tsx apps/web/src/components/app-shell.tsx apps/web/src/hooks/use-onboarding.ts apps/web/src/components/board-card.tsx
git commit -m "feat(web): card detail skeleton, ctrl+k search focus, persistent onboarding skip"
```

### Task 10: Filter empty-state + clear filter button

**Files:**

- Modify: `apps/web/src/components/kanban.tsx`, `apps/web/src/components/board-column.tsx`, `apps/web/src/components/board-toolbar.tsx`

**Interfaces:**

- `BoardColumn` gains prop `isFiltered?: boolean`

- [x] **Step 1: BoardColumn — filtered empty message**

In `board-column.tsx`, add prop `isFiltered` (`{ isFiltered?: boolean }`). Change empty state (lines 69-72):

```tsx
{cards.length === 0 ? (
  <p className="p-3 text-center text-xs text-muted-foreground">
    {isFiltered ? "No cards match filter" : "No cards"}
  </p>
) : (
```

- [x] **Step 2: kanban.tsx — pass isFiltered**

In `kanban.tsx` column map, pass `isFiltered={filters.priority !== "" || filters.query !== ""}`.

- [x] **Step 3: board-toolbar.tsx — clear button**

Add at the end of the toolbar (after the priority group), only when a filter is active:

```tsx
{
  ;(filters.priority !== "" || filters.query !== "") && (
    <button
      onClick={() => onChange({ priority: "", query: "" })}
      data-testid="clear-filters"
      className="rounded-md px-2 py-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
    >
      Clear
    </button>
  )
}
```

- [x] **Step 4: Run web tests**

Run: `bun --filter web test`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/components/kanban.tsx apps/web/src/components/board-column.tsx apps/web/src/components/board-toolbar.tsx
git commit -m "feat(web): distinguish filtered board empty state with clear action"
```

### Task 11: Unify "frozen" terminology → "closed"

**Files:**

- Modify: `apps/web/src/components/board-card.tsx:56`, `apps/web/src/components/card-drawer.tsx:131,176`, `apps/web/src/components/closed-rail.tsx:25,52`, `apps/web/src/routes/card-detail.tsx:100`, `apps/web/src/routes/project-board.tsx:85`
- Test: `apps/web/src/components/__tests__/board-card.test.tsx:29`

- [x] **Step 1: Update failing test**

`board-card.test.tsx:29`: `getByText("frozen")` → `getByText("closed")`.

- [x] **Step 2: Replace labels**

- `board-card.tsx:56`: `{isClosed ? "frozen" : ...}` → `"closed"`
- `card-drawer.tsx:131`: `"frozen"` → `"closed"`
- `card-drawer.tsx:176`: "This card is closed and read-only." stays (already closed wording)
- `closed-rail.tsx:25`: `Frozen` → `Closed`; `closed-rail.tsx:52`: `frozen` → `closed`
- `card-detail.tsx:100`: `"frozen"` → `"closed"`
- `project-board.tsx:85`: `frozen` → `closed`

- [x] **Step 3: Run web tests**

Run: `bun --filter web test`
Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/board-card.tsx apps/web/src/components/card-drawer.tsx apps/web/src/components/closed-rail.tsx apps/web/src/routes/card-detail.tsx apps/web/src/routes/project-board.tsx apps/web/src/components/__tests__/board-card.test.tsx
git commit -m "style(web): use 'closed' terminology for frozen cards"
```

### Task 12: Code-split heavy routes

**Files:**

- Modify: `apps/web/src/App.tsx`

**Interfaces:** none.

- [x] **Step 1: Lazy-load heavy routes**

In `App.tsx`, convert these imports to lazy:

```tsx
const CardDetailPage = lazy(() => import("@/routes/card-detail").then((m) => ({ default: m.CardDetailPage })))
const ProposalsPage = lazy(() => import("@/routes/proposals").then((m) => ({ default: m.ProposalsPage })))
const BillingPage = lazy(() => import("@/routes/billing").then((m) => ({ default: m.BillingPage })))
const AnalyticsPage = lazy(() => import("@/routes/analytics").then((m) => ({ default: m.AnalyticsPage })))
const OrgMembersPage = lazy(() => import("@/routes/org-members").then((m) => ({ default: m.OrgMembersPage })))
const OnboardingPage = lazy(() => import("@/routes/onboarding").then((m) => ({ default: m.OnboardingPage })))
const ProjectSettingsPage = lazy(() => import("@/routes/project-settings").then((m) => ({ default: m.ProjectSettingsPage }))
```

Remove the static imports for those 7. Add `import { lazy } from "react"`. Wrap the protected `<Route element={<AppShell />}>` block's `<Outlet />` consumer — simplest: wrap each lazy route element with `<Suspense fallback={null}>` via a small helper:

```tsx
function Suspended({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}
```

and use `element={<Suspended><CardDetailPage /></Suspended>}` etc. (keep the project-board route static — it is the main entry).

- [x] **Step 2: Run tests + typecheck + build**

Run: `bun --filter web test && bun run typecheck && bun --filter web build`
Expected: PASS, build succeeds.

- [x] **Step 3: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "perf(web): code-split heavy routes"
```

---

## Full verification gate

- [x] `bun --filter web test`
- [x] `bun run typecheck`
- [x] `bun run lint`
- [x] `bun run format`
- [x] `git log --oneline` shows 12 atomic conventional commits
