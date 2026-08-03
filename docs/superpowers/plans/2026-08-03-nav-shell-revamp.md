# Navigation & Shell Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix nav/layout defects (mobile nav, duplicate Chat link, header overflow, debug dashboard, blank card-detail, toaster z-index) and polish auth + landing pages with a consistent neutral enterprise aesthetic.

**Architecture:** Restructure `app-shell.tsx` around a responsive sidebar (persistent desktop / slide-in drawer mobile) + breadcrumb header + user dropdown. Add a project-level tab bar. Extract nav config into a pure, unit-tested module. Refactor auth pages onto a shared `AuthShell`. Redirect the debug dashboard away.

**Tech Stack:** React 19, React Router 7, Tailwind v4, shadcn (`@workspace/ui`), zustand, lucide-react, Vitest.

## Global Constraints

- No new npm dependencies.
- All UI components from `@workspace/ui/components/*`; never raw HTML where a shadcn component exists (except drawer backdrop, which has no shadcn equivalent).
- Keep `data-testid` values: `new-board`, `limit-tooltip`, `nav-billing`, `nav-analytics`, `view-switcher-board`, `view-switcher-graph`, `toaster`, `toast`.
- Named exports only; `type` imports preferred.
- Conventional Commits; commit after every green task.

---

## Phase A — Shell + Navigation

### Task A1: Extract nav config into testable module

**Files:**

- Create: `apps/web/src/lib/nav-items.ts`
- Test: `apps/web/src/__tests__/nav-items.test.ts`

**Interfaces:**

- Produces: `WorkspaceNavItem`, `OrgNavItem`, `getWorkspaceNavItems(): WorkspaceNavItem[]`, `getOrgNavItems(orgId: string | undefined): OrgNavItem[]`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest"
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"

describe("nav-items", () => {
  it("workspace nav has exactly Boards (Chat is project-scoped)", () => {
    const items = getWorkspaceNavItems()
    expect(items.map((i) => i.label)).toEqual(["Boards"])
    expect(items[0].to).toBe("/projects")
  })

  it("org nav builds from org id", () => {
    const items = getOrgNavItems("org_1")
    expect(items.map((i) => i.label)).toEqual([
      "Members",
      "Billing",
      "Analytics",
    ])
    expect(items[0].to).toBe("/orgs/org_1/members")
  })

  it("org nav is empty without org id", () => {
    expect(getOrgNavItems(undefined)).toEqual([])
  })
})
```

- [ ] **Step 2: Run to confirm fail**

Run: `bun --filter web test src/__tests__/nav-items.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export type WorkspaceNavItem = {
  label: "Boards"
  to: string
}

export type OrgNavItem = {
  label: "Members" | "Billing" | "Analytics"
  to: string
  testId?: string
}

export function getWorkspaceNavItems(): WorkspaceNavItem[] {
  return [{ label: "Boards", to: "/projects" }]
}

export function getOrgNavItems(orgId: string | undefined): OrgNavItem[] {
  if (!orgId) return []
  return [
    { label: "Members", to: `/orgs/${orgId}/members` },
    { label: "Billing", to: `/orgs/${orgId}/billing`, testId: "nav-billing" },
    {
      label: "Analytics",
      to: `/orgs/${orgId}/analytics`,
      testId: "nav-analytics",
    },
  ]
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `bun --filter web test src/__tests__/nav-items.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/nav-items.ts apps/web/src/__tests__/nav-items.test.ts
git commit -m "feat(web): extract sidebar nav config into testable module"
```

### Task A2: ProjectTabs component

**Files:**

- Create: `apps/web/src/components/project-tabs.tsx`
- Test: `apps/web/src/__tests__/project-tabs.test.tsx`

**Interfaces:**

- Consumes: none (route-driven).
- Produces: `ProjectTabs({ slug }: { slug: string })` — rendered in shell when inside a project.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { ProjectTabs } from "@/components/project-tabs"

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:slug/*" element={<ProjectTabs slug="acme" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ProjectTabs", () => {
  it("renders Board, Graph, Chat", () => {
    renderAt("/projects/acme")
    expect(screen.getByRole("tab", { name: "Board" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Graph" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Chat" })).toBeInTheDocument()
  })

  it("Board active on board view", () => {
    renderAt("/projects/acme")
    expect(screen.getByTestId("view-switcher-board")).toHaveAttribute(
      "data-state",
      "active"
    )
  })

  it("Graph active on ?view=graph", () => {
    renderAt("/projects/acme?view=graph")
    expect(screen.getByTestId("view-switcher-graph")).toHaveAttribute(
      "data-state",
      "active"
    )
  })

  it("Chat active on chat route", () => {
    renderAt("/projects/acme/chat")
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute(
      "data-state",
      "active"
    )
  })
})
```

- [ ] **Step 2: Run to confirm fail**

Run: `bun --filter web test src/__tests__/project-tabs.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
import { NavLink, useSearchParams } from "react-router"
import { cn } from "@workspace/ui/lib/utils"

const tabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:text-foreground"
  )

export function ProjectTabs({ slug }: { slug: string }) {
  const [searchParams] = useSearchParams()
  const view = searchParams.get("view") ?? "board"
  const boardBase = `/projects/${slug}`
  const graphTo = view === "graph" ? boardBase : `${boardBase}?view=graph`

  return (
    <nav className="flex items-center gap-1 border-b bg-background px-4 py-1.5">
      <NavLink
        to={boardBase}
        end
        className={tabClass}
        data-testid="view-switcher-board"
      >
        Board
      </NavLink>
      <NavLink
        to={graphTo}
        className={tabClass}
        data-testid="view-switcher-graph"
      >
        Graph
      </NavLink>
      <NavLink to={`/projects/${slug}/chat`} className={tabClass}>
        Chat
      </NavLink>
    </nav>
  )
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `bun --filter web test src/__tests__/project-tabs.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/project-tabs.tsx apps/web/src/__tests__/project-tabs.test.tsx
git commit -m "feat(web): add project-level Board/Graph/Chat tabs"
```

### Task A3: Restructure AppShell (header, drawer, sidebar, user dropdown)

**Files:**

- Create: `apps/web/src/components/theme-toggle.tsx`
- Modify: `apps/web/src/components/app-shell.tsx` (full rewrite of nav/header)
- Modify: `apps/web/src/components/user-menu.tsx` (rewrite as dropdown)
- Modify: `apps/web/src/stores/app-store.ts` (add `setSidebarOpen`)

**Interfaces:**

- Consumes: `getWorkspaceNavItems`, `getOrgNavItems` (Task A1); `ProjectTabs` (Task A2); `useTheme` (existing).
- Produces: `ThemeToggle()` — header button; `UserMenu` keeps `name`, `role?`, `onLogout` props signature.

- [ ] **Step 1: Add `setSidebarOpen` to app-store**

```ts
export const useAppStore = create<{
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
```

(Adjust only the missing `setSidebarOpen` line if the store already has the other fields.)

- [ ] **Step 2: Create ThemeToggle**

```tsx
import { Moon, Sun } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const resolved = theme === "system" ? "light" : theme
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  )
}
```

- [ ] **Step 3: Rewrite UserMenu as dropdown**

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@workspace/ui/components/button"
import { ChevronsUpDown } from "lucide-react"

const roleBadgeClasses: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  admin: "bg-secondary text-secondary-foreground",
  member: "bg-muted text-muted-foreground",
  viewer: "bg-muted/50 text-muted-foreground",
}

export function UserMenu({
  name,
  role,
  onLogout,
}: {
  name: string
  role?: "owner" | "admin" | "member" | "viewer"
  onLogout: () => void
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "U"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{name}</span>
        <ChevronsUpDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{name}</span>
            {role && (
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClasses[role] ?? roleBadgeClasses.member}`}
              >
                {role}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Rewrite AppShell**

```tsx
import { useEffect } from "react"
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import { useAppStore } from "@/stores/app-store"
import { useBoardStore } from "@/stores/board-store"
import { useAuth } from "@/hooks/use-auth"
import { useOrgs } from "@/hooks/use-orgs"
import { useUsage } from "@/hooks/use-billing"
import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"
import { EnvIndicator } from "./env-indicator"
import { LimitBanner } from "./limit-banner"
import { ThemeToggle } from "./theme-toggle"
import { ProjectTabs } from "./project-tabs"
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { LayoutGrid } from "lucide-react"

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
    isActive
      ? "bg-muted font-medium"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )

function SidebarContent() {
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <OrgSwitcher />
      <div>
        <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Workspace
        </p>
        <nav className="space-y-1">
          {getWorkspaceNavItems().map((item) => (
            <NavLink key={item.label} to={item.to} className={linkClass}>
              <LayoutGrid className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {getOrgNavItems(selectedOrgId).length > 0 && (
        <div>
          <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Org
          </p>
          <nav className="space-y-1">
            {getOrgNavItems(selectedOrgId).map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={linkClass}
                data-testid={item.testId}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams<{ slug: string }>()
  const { data: orgs } = useOrgs()
  const activeOrg = orgs?.find((o) => o.id === selectedOrgId) ?? orgs?.[0]
  const role = activeOrg?.role
  const { isAtLimit } = useUsage(activeOrg?.id)
  const projectsLimited = isAtLimit("projects")

  const inProject = Boolean(slug)
  const pageLabel =
    location.pathname === "/projects"
      ? "Boards"
      : inProject
        ? location.pathname.endsWith("/chat")
          ? "Chat"
          : "Board"
        : location.pathname.includes("/members")
          ? "Members"
          : location.pathname.includes("/billing")
            ? "Billing"
            : location.pathname.includes("/analytics")
              ? "Analytics"
              : ""

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  const newBoardButton = (
    <Button
      variant="default"
      size="sm"
      disabled={projectsLimited}
      data-testid="new-board"
      onClick={() => navigate("/projects")}
    >
      New board
    </Button>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="rounded-md border border-transparent px-2 py-1 text-sm hover:bg-muted md:hidden"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="font-semibold whitespace-nowrap">Storyteller</span>
            {(activeOrg || inProject) && (
              <span className="truncate text-muted-foreground">
                {activeOrg?.name}
                {inProject && (activeOrg ? " / " : "")}
                {inProject ? slug : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {projectsLimited ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex" data-testid="limit-tooltip" />
                }
              >
                {newBoardButton}
              </TooltipTrigger>
              <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
            </Tooltip>
          ) : (
            newBoardButton
          )}
          <EnvIndicator />
          <ThemeToggle />
          {user && <UserMenu name={user.name} role={role} onLogout={logout} />}
        </div>
      </header>

      {inProject && <ProjectTabs slug={slug} />}

      <LimitBanner orgId={selectedOrgId ?? activeOrg?.id} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r bg-background p-3 md:block">
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              aria-label="Close sidebar"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-60 border-r bg-background p-3 shadow-lg">
              <SidebarContent />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Remove duplicate view-switcher usage in board page**

In `apps/web/src/routes/project-board.tsx`, remove the `<ViewSwitcher />` render and its import (the shell `ProjectTabs` now provides Board/Graph/Chat switching and carries the `view-switcher-*` testids). Confirm nothing else imports `ViewSwitcher` (`grep -rn "ViewSwitcher" apps/web/src`).

- [ ] **Step 6: Typecheck + build**

Run: `bun --filter web typecheck` then `bun --filter web build`
Expected: PASS.

- [ ] **Step 7: Run web unit tests**

Run: `bun --filter web test`
Expected: PASS — nav-items + project-tabs + existing suites.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/app-shell.tsx apps/web/src/components/user-menu.tsx apps/web/src/components/theme-toggle.tsx apps/web/src/stores/app-store.ts apps/web/src/routes/project-board.tsx
git commit -m "refactor(web): responsive shell with breadcrumb header and user dropdown"
```

### Task A4: Redirect debug dashboard

**Files:**

- Modify: `apps/web/src/App.tsx` (replace DashboardPage with redirect)
- Modify: `apps/web/src/routes/login.tsx:43` (navigate `/projects`)
- Modify: `apps/web/src/components/protected-route.tsx` (redirect target `/projects`)
- Delete: `apps/web/src/routes/dashboard.tsx`

- [ ] **Step 1: Replace dashboard route**

In `App.tsx`, remove `import { DashboardPage }`, add `import { Navigate } from "react-router"`, and replace the route:

```tsx
<Route path="/dashboard" element={<Navigate to="/projects" replace />} />
```

- [ ] **Step 2: Update login redirect**

In `login.tsx`, change `navigate("/dashboard")` → `navigate("/projects")`.

- [ ] **Step 3: Update protected-route redirect**

Read `protected-route.tsx`, replace every `/dashboard` redirect target with `/projects`. Confirm `grep -rn '"/dashboard"\|"/projects"\|"/login"' apps/web/src` for remaining `/dashboard` references outside the App.tsx redirect; if any other route redirects to `/dashboard`, point it at `/projects`.

- [ ] **Step 4: Delete dashboard**

```bash
rm apps/web/src/routes/dashboard.tsx
```

- [ ] **Step 5: Typecheck + build**

Run: `bun --filter web typecheck` then `bun --filter web build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/routes/login.tsx apps/web/src/components/protected-route.tsx apps/web/src/routes/dashboard.tsx
git commit -m "refactor(web): replace debug dashboard with redirect to boards"
```

### Task A5: Fix card-detail blank page

**Files:**

- Modify: `apps/web/src/routes/card-detail.tsx`
- Modify: `apps/web/src/components/card-drawer.tsx` (onClose back behavior stays in route)

- [ ] **Step 1: Rewrite card-detail**

```tsx
import { Link, useNavigate, useParams } from "react-router"
import { useCards } from "@/hooks/use-cards"
import { CardDrawer } from "@/components/card-drawer"
import { Button } from "@workspace/ui/components/button"

export function CardDetailPage() {
  const { slug, cardSlug } = useParams<{ slug: string; cardSlug: string }>()
  const navigate = useNavigate()
  const { data: cards } = useCards(slug)
  const card = cards?.find((c) => c.slug === cardSlug)

  if (!card) {
    return (
      <div className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm text-muted-foreground">Card not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to={`/projects/${slug ?? ""}`}>Back to board</Link>
        </Button>
      </div>
    )
  }

  return (
    <CardDrawer
      cardId={card.id}
      open
      onClose={() => navigate(`/projects/${slug ?? ""}`, { replace: true })}
      projectSlug={slug ?? ""}
    />
  )
}
```

- [ ] **Step 2: Typecheck + build**

Run: `bun --filter web typecheck` then `bun --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/card-detail.tsx
git commit -m "fix(web): navigate back to board when card drawer closes"
```

### Task A6: Fix toaster z-index

**Files:**

- Modify: `apps/web/src/components/toaster.tsx:16`

- [ ] **Step 1: Change z-index**

Replace `fixed right-4 bottom-4 z-50` with `fixed right-4 bottom-4 z-[60]` (drawers/dialogs are `z-50`; toasts must stack above).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/toaster.tsx
git commit -m "fix(web): raise toaster above drawer and dialog backdrops"
```

---

## Phase B — Auth polish

### Task B1: Shared AuthShell

**Files:**

- Create: `apps/web/src/components/auth-shell.tsx`
- Modify: `apps/web/src/routes/login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`

**Interfaces:**

- Produces: `AuthShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode })`

- [ ] **Step 1: Create AuthShell**

```tsx
import type { ReactNode } from "react"
import { Link } from "react-router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 p-6">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <span className="text-xl font-semibold tracking-tight">
          Storyteller
        </span>
      </Link>
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Refactor login page**

Wrap the existing form in `AuthShell`, moving the card out:

```tsx
return (
  <AuthShell title="Sign in" description="Enter your credentials to continue">
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4 pt-2">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <div className="flex w-full justify-between text-sm">
          <Link
            to="/signup"
            className="text-muted-foreground hover:text-foreground"
          >
            Create account
          </Link>
          <Link
            to="/forgot-password"
            className="text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
      </div>
    </form>
  </AuthShell>
)
```

Remove now-unused `Card*` imports from `login.tsx`.

- [ ] **Step 3: Refactor remaining auth pages**

Apply the same pattern to `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`: replace the outer `flex min-h-svh items-center justify-center p-6` + `<Card>` wrapper with `<AuthShell title=... description=...>`, move the form/content inside `CardContent` (now implicit), remove unused `Card*` imports. Preserve every form field, validation message, error block, and button exactly.

- [ ] **Step 4: Typecheck + build + test**

Run: `bun --filter web typecheck` then `bun --filter web build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/auth-shell.tsx apps/web/src/routes/login.tsx apps/web/src/routes/signup.tsx apps/web/src/routes/forgot-password.tsx apps/web/src/routes/reset-password.tsx apps/web/src/routes/verify-email.tsx
git commit -m "refactor(web): shared AuthShell for consistent auth pages"
```

---

## Phase C — Landing polish

### Task C1: Landing page polish

**Files:**

- Modify: `apps/web/src/routes/landing.tsx`

- [ ] **Step 1: Polish landing**

Apply these concrete edits to `landing.tsx`:

1. Header: keep structure, set `bg-background/80 backdrop-blur` on the sticky header (`sticky top-0 z-10 bg-background/80 backdrop-blur` replacing `border-b`), keep links/buttons.
2. Hero: reduce `gap-20 py-20` to `gap-14 py-16 md:py-24`; keep h1/p/CTA copy.
3. Steps section: add step numbers as small `text-muted-foreground` mono digits instead of "Step N" labels — replace the `<span>Step {i + 1}</span>` line with `<span className="text-xs font-medium text-muted-foreground tabular-nums">0{i + 1}</span>` and drop the `uppercase` label.
4. Features grid: `gap-4` → `gap-5`; cards keep titles/body.
5. CTA section: keep.
6. Footer: keep.

No copy changes to hero/product wording.

- [ ] **Step 2: Typecheck + build**

Run: `bun --filter web typecheck` then `bun --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/landing.tsx
git commit -m "style(web): polish landing typography and spacing"
```

---

## Phase D — Verification

### Task D1: Full-suite e2e verification

- [ ] **Step 1: Ensure stack up**

Run: `docker compose up -d postgres mailpit api web`
Expected: all healthy (`docker compose ps`).

- [ ] **Step 2: Run repo checks**

Run: `bun run lint` and `bun run typecheck`
Expected: lint + typecheck green. (If `api#lint` fails on the pre-existing `plan-limits.ts` unused `db` import — unrelated to this plan — do NOT fix it here; note it and continue.)

- [ ] **Step 3: Run e2e suite**

Run: `bun run test:e2e`
Expected: full Playwright suite green — smoke + core-loop J1-J4 + phase-2 + phase-3 journeys. Key flows exercised: login → boards → project board (board/graph tabs) → chat → billing/members/analytics via sidebar.

- [ ] **Step 4: Report**

Summarize: what changed per phase, test counts, any pre-existing failures that are out of scope.
