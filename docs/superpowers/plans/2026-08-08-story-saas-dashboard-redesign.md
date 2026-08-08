# Story-SaaS-Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the Storyteller web app to the dark-navy design system defined in the Story-SaaS-Dashboard mockups — palette, JetBrains Mono, sidebar/topbar shell, board cards, frozen rail, proposal banner, graph nodes, card drawer, landing, and auth — on the existing React/Tailwind v4/shadcn stack.

**Architecture:** Token-first. Reference hex palette is mapped once into shadcn CSS variables in `packages/ui/src/styles/globals.css` (dark-only `:root`). All existing shadcn components inherit the palette automatically. Then each app component is restructured/restyled to the reference anatomy while preserving every `data-testid` and accessible label that Playwright/Vitest rely on.

**Tech Stack:** React 19, Tailwind CSS v4, shadcn/ui (`@workspace/ui`), lucide-react, React Router 7, Vitest, Playwright, Bun.

## Global Constraints

- **Repro `package.json` — pinned exact versions (`.npmrc` sets `save-exact=true`).** `bun add` writes exact — never bump manually.
- **Dark-only.** `:root` holds the reference palette. No `.dark` overrides, no light theme.
- **Never change these e2e selectors/labels** (Playwright depends on them): testids `board-card`, `closed-card`, `history-tab`, `close-card`, `copy-link`, `card-drawer-title`, `proposal-item`, `approve-proposal`, `proposal-status`, `graph-canvas`, `graph-node-{id}`, `impact-banner`, `impact-clear`, `impact-toggle`, `edge-filter-dependency`, `comment-input`, `comment-post`, `comment-item`, `comment-mention`, `mention-picker`, `mention-option-{userId}`, `export-menu`, `export-csv`, `export-json`, `export-markdown`, `prompt-input`, `live-indicator`, `onboarding-{start,skip,welcome,template}`, `view-switcher-graph`, `closed-rail-toggle`, `similar-list`, `new-comments-pill`, `limit-tooltip`; labels "Sign in" (button), "Create account" (signup button), "Create account" (link on login), "Forgot password?" (link), "Get started" (landing link), "New board" (button), "Create" (exact, projects form), "Name"/"Email"/"Password"/"Confirm password" (auth inputs), heading "Boards".
- **No new routes.** Board AI bar "Run" navigates to `/projects/:slug/chat`. No "New requirement" button on the board header.
- **Named exports only. `type` imports. No default exports.**
- **No code comments** unless asked.
- Run `bun run lint`, `bun run typecheck`, and `bun --filter web test` after each task. Web tests use Vitest.
- Auth inputs must stay reachable via `<label htmlFor>` / `getByLabel` (keep `Label` + `Input` association in auth pages).

## File Structure

- `packages/ui/src/styles/globals.css` — palette tokens, fonts, success/warn utilities, radius
- `packages/ui/package.json` — add `@fontsource/jetbrains-mono`
- `apps/web/index.html` — `class="dark"` on `<html>`
- `apps/web/src/components/theme-provider.tsx` — pin dark, keep `useTheme`
- `apps/web/src/components/theme-toggle.tsx` — DELETE
- `apps/web/src/components/app-shell.tsx` — reference sidebar + topbar
- `apps/web/src/lib/nav-items.ts` — add icon per item
- `apps/web/src/components/org-switcher.tsx` — reference org-switch dropdown
- `apps/web/src/components/user-menu.tsx` — reference avatar footer style
- `apps/web/src/lib/priority.ts` — P0/P1/P2 mapping
- `apps/web/src/components/board-card.tsx` — reference card anatomy
- `apps/web/src/components/board-column.tsx` — reference column header
- `apps/web/src/components/kanban.tsx` — column layout tweaks
- `apps/web/src/components/closed-rail.tsx` — frozen rail
- `apps/web/src/components/card-drawer.tsx` — reference drawer blocks
- `apps/web/src/components/diff-panel.tsx` — reference diff rows
- `apps/web/src/components/graph-node.tsx`, `graph-edge.tsx`, `graph-canvas.tsx` — reference graph styling
- `apps/web/src/routes/project-board.tsx` — AI bar + proposal banner + header
- `apps/web/src/routes/landing.tsx` — rebuild
- `apps/web/src/components/auth-shell.tsx` — reference auth card
- `apps/web/src/routes/{login,signup,forgot-password,reset-password,verify-email}.tsx` — align labels/banners
- Tests: `apps/web/src/__tests__/nav-items.test.ts`, `apps/web/src/components/__tests__/{board-card,diff-panel,app-shell}.test.tsx`

---

### Task 1: Design tokens + fonts

**Files:**

- Modify: `packages/ui/src/styles/globals.css`
- Modify: `packages/ui/package.json`
- Test: run `bun --filter web typecheck` (no unit test — CSS tokens)

**Interfaces:**

- Produces: CSS vars `--success`, `--warn`, `--color-success`, `--color-warn`, `--font-mono: "JetBrains Mono"`; `:root` = reference palette.

- [ ] **Step 1: Add font dependency**

Run:

```bash
bun --filter @workspace/ui add @fontsource/jetbrains-mono
```

Expected: `packages/ui/package.json` gains `"@fontsource/jetbrains-mono": "<exact version>"` (save-exact).

- [ ] **Step 2: Replace globals.css tokens**

Replace the `:root { ... }` block (lines 57-93) and the `.dark { ... }` block (lines 95-130) in `packages/ui/src/styles/globals.css` with a single dark-only `:root`:

```css
:root {
  --background: #0b1020;
  --foreground: #f8fafc;
  --card: #131b2f;
  --card-foreground: #f8fafc;
  --popover: #131b2f;
  --popover-foreground: #f8fafc;
  --primary: #60a5fa;
  --primary-foreground: #06111f;
  --secondary: #182343;
  --secondary-foreground: #cbd5e1;
  --muted: #182343;
  --muted-foreground: #8ea0b8;
  --accent: #182343;
  --accent-foreground: #cbd5e1;
  --destructive: #fb7185;
  --border: #293653;
  --input: #293653;
  --ring: #60a5fa;
  --success: #22c55e;
  --warn: #fbbf24;
  --chart-1: #60a5fa;
  --chart-2: #fbbf24;
  --chart-3: #22c55e;
  --chart-4: #38bdf8;
  --chart-5: #fb7185;
  --radius: 0.75rem;
  --edge-dependency: #60a5fa;
  --edge-hierarchy: #8ea0b8;
  --edge-evolution: #fbbf24;
  --sidebar: #131b2f;
  --sidebar-foreground: #cbd5e1;
  --sidebar-primary: #60a5fa;
  --sidebar-primary-foreground: #06111f;
  --sidebar-accent: #182343;
  --sidebar-accent-foreground: #f8fafc;
  --sidebar-border: #1e2a43;
  --sidebar-ring: #60a5fa;
}
```

Then update the `@theme inline` block (lines 11-55) to add the new color + mono font. Add these lines inside the existing `@theme inline` block:

```css
--color-success: var(--success);
--color-warn: var(--warn);
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

Add the JetBrains Mono import after the Inter import (line 4):

```css
@import "@fontsource/jetbrains-mono";
@import "@fontsource/jetbrains-mono/500.css";
```

- [ ] **Step 3: Remove dead `.dark` custom-variant usage if safe**

The `@custom-variant dark (&:is(.dark *));` line may stay (harmless) — leave it. Do not add a `.dark` block.

- [ ] **Step 4: Verify**

Run:

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/styles/globals.css packages/ui/package.json bun.lock
git commit -m "style: apply Story-SaaS dashboard palette tokens and mono font"
```

---

### Task 2: Pin dark theme, remove toggle

**Files:**

- Modify: `apps/web/index.html`
- Modify: `apps/web/src/components/theme-provider.tsx`
- Delete: `apps/web/src/components/theme-toggle.tsx`
- Modify: `apps/web/src/components/app-shell.tsx` (remove `ThemeToggle` import + usage only)

**Interfaces:**

- Consumes: existing `useTheme` consumers (only `theme-toggle.tsx`, which is deleted).
- Produces: `ThemeProvider` that always applies `dark`; `useTheme` unchanged signature.

- [ ] **Step 1: Update index.html**

In `apps/web/index.html` line 2, change:

```html
<html lang="en"></html>
```

to:

```html
<html lang="en" class="dark"></html>
```

- [ ] **Step 2: Pin theme-provider to dark**

Replace the body of `theme-provider.tsx` with a thin dark-pinning provider that keeps the `useTheme` export:

```tsx
/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme] = React.useState<Theme>(defaultTheme)

  const setTheme = React.useCallback((_nextTheme: Theme) => {
    // Design is dark-only; theme switching is intentionally disabled.
  }, [])

  React.useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, "dark")
    } catch {
      // ignore quota/security errors
    }
  }, [storageKey])

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
```

- [ ] **Step 3: Remove ThemeToggle**

Run:

```bash
rm apps/web/src/components/theme-toggle.tsx
```

In `apps/web/src/components/app-shell.tsx`: remove `import { ThemeToggle } from "./theme-toggle"` and the `<ThemeToggle />` line.

- [ ] **Step 4: Verify**

Run:

```bash
bun run lint
bun run typecheck
bun --filter web test
```

Expected: all PASS. `app-shell.test.tsx` still passes (it renders AppShell and checks text; `defaultTheme="light"` passed to the provider is now ignored).

- [ ] **Step 5: Commit**

```bash
git add apps/web/index.html apps/web/src/components/theme-provider.tsx apps/web/src/components/theme-toggle.tsx apps/web/src/components/app-shell.tsx
git commit -m "refactor(web): pin dark theme and drop theme toggle"
```

---

### Task 3: Nav items with icons

**Files:**

- Modify: `apps/web/src/lib/nav-items.ts`
- Test: `apps/web/src/__tests__/nav-items.test.ts`

**Interfaces:**

- Produces:

```ts
type WorkspaceNavItem = { label: "Boards"; to: string; icon: LucideIcon }
type OrgNavItem = {
  label: "Members" | "Billing" | "Analytics"
  to: string
  icon: LucideIcon
  testId?: string
}
```

- [ ] **Step 1: Update the failing test**

In `apps/web/src/__tests__/nav-items.test.ts`, add icon assertions:

```ts
import { describe, it, expect } from "vitest"
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"

describe("nav-items", () => {
  it("workspace nav has exactly Boards (Chat is project-scoped)", () => {
    const items = getWorkspaceNavItems()
    expect(items.map((i) => i.label)).toEqual(["Boards"])
    expect(items[0].to).toBe("/projects")
    expect(items[0].icon).toBeTypeOf("function")
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

- [ ] **Step 2: Run to verify it fails**

Run: `bun --filter web test -- --run src/__tests__/nav-items.test.ts`
Expected: FAIL — `items[0].icon` is `undefined`.

- [ ] **Step 3: Implement**

Replace `apps/web/src/lib/nav-items.ts`:

```ts
import { ChartNoAxesColumn, CreditCard, LayoutGrid, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type WorkspaceNavItem = {
  label: "Boards"
  to: string
  icon: LucideIcon
}

export type OrgNavItem = {
  label: "Members" | "Billing" | "Analytics"
  to: string
  icon: LucideIcon
  testId?: string
}

export function getWorkspaceNavItems(): WorkspaceNavItem[] {
  return [{ label: "Boards", to: "/projects", icon: LayoutGrid }]
}

export function getOrgNavItems(orgId: string | undefined): OrgNavItem[] {
  if (!orgId) return []
  return [
    { label: "Members", to: `/orgs/${orgId}/members`, icon: Users },
    {
      label: "Billing",
      to: `/orgs/${orgId}/billing`,
      icon: CreditCard,
      testId: "nav-billing",
    },
    {
      label: "Analytics",
      to: `/orgs/${orgId}/analytics`,
      icon: ChartNoAxesColumn,
      testId: "nav-analytics",
    },
  ]
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun --filter web test -- --run src/__tests__/nav-items.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/nav-items.ts apps/web/src/__tests__/nav-items.test.ts
git commit -m "feat(web): add icons to sidebar nav items"
```

---

### Task 4: AppShell rebuild (sidebar + topbar)

**Files:**

- Modify: `apps/web/src/components/app-shell.tsx`
- Test: `apps/web/src/components/__tests__/app-shell.test.tsx`

**Interfaces:**

- Consumes: `getWorkspaceNavItems()`, `getOrgNavItems(orgId)` (Task 3), `OrgSwitcher` (Task 5), `UserMenu` (Task 6), existing `useAppStore`, `useAuth`, `useOrgs`, `useUsage`, `useBoardStore`.
- Produces: `AppShell` with reference sidebar (brand, org switcher, nav groups Workspace/Manage, user footer) + topbar (breadcrumb, search box w/ Ctrl K kbd, notifications, EnvIndicator, New board, avatar).

- [ ] **Step 1: Write the failing test**

Append to `apps/web/src/components/__tests__/app-shell.test.tsx` inside `describe("AppShell", ...)`:

```tsx
it("renders the workspace and manage nav groups", () => {
  renderWithRouter(<AppShell />)
  expect(screen.getByText("Workspace")).toBeInTheDocument()
  expect(screen.getByText("Manage")).toBeInTheDocument()
  expect(screen.getByText("Boards")).toBeInTheDocument()
})

it("keeps the New board action", () => {
  renderWithRouter(<AppShell />)
  expect(screen.getByTestId("new-board")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun --filter web test -- --run src/components/__tests__/app-shell.test.tsx`
Expected: FAIL — "Workspace"/"Manage" headings not rendered.

- [ ] **Step 3: Rebuild AppShell**

Replace `apps/web/src/components/app-shell.tsx` with the reference layout. Keep all existing data wiring (`limitBanner`, `newBoardButton`, `activeOrg`, `inProject`, mobile drawer toggle):

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
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { Bell, Home, Search } from "lucide-react"

const groupClass =
  "px-3 pb-1.5 pt-3 font-mono text-[10.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase"

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    isActive &&
      "border border-border bg-background font-semibold text-foreground"
  )

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: typeof LayoutGrid
  active: boolean
}) {
  return (
    <Icon
      className={cn(
        "size-4.5 shrink-0 opacity-80",
        active && "text-primary opacity-100"
      )}
    />
  )
}
```

Note: `LayoutGrid` is referenced above; import it:

```tsx
import { Bell, LayoutGrid, Search } from "lucide-react"
```

Rewrite `SidebarContent`:

```tsx
function SidebarContent() {
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const workspaceItems = getWorkspaceNavItems()
  const orgItems = getOrgNavItems(selectedOrgId ?? undefined)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <span className="grid size-7.5 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            className="size-4"
          >
            <path d="M13 2 3 14h6l-2 8 10-12h-6l2-8z" />
          </svg>
        </span>
        <span className="text-[15px] font-bold tracking-tight">
          Storyteller
        </span>
      </div>

      <OrgSwitcher />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        <p className={groupClass}>Workspace</p>
        {workspaceItems.map((item) => (
          <NavLink key={item.label} to={item.to} className={linkClass}>
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-4.5 shrink-0 opacity-80",
                    isActive && "text-primary opacity-100"
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {orgItems.length > 0 && (
          <>
            <p className={cn(groupClass, "pt-4")}>Manage</p>
            {orgItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={linkClass}
                data-testid={item.testId}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "size-4.5 shrink-0 opacity-80",
                        isActive && "text-primary opacity-100"
                      )}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t px-2.5 py-2.5">
        <UserMenu name={userMenuName} role={activeRole} onLogout={logout} />
      </div>
    </div>
  )
}
```

Because `SidebarContent` needs `user`/`role`/`logout` but `AppShell` owns those, pass them as props:

```tsx
function SidebarContent({
  name,
  role,
  onLogout,
}: {
  name: string
  role?: "owner" | "admin" | "member" | "viewer"
  onLogout: () => void
}) {
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const workspaceItems = getWorkspaceNavItems()
  const orgItems = getOrgNavItems(selectedOrgId ?? undefined)
  ...
}
```

In `AppShell` topbar, replace the current header (lines 127-167) with:

```tsx
<header className="flex h-13 shrink-0 items-center gap-4 border-b px-6">
  <button
    onClick={toggleSidebar}
    className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted md:hidden"
    aria-label="Toggle sidebar"
  >
    ☰
  </button>
  <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
    <span className="font-bold whitespace-nowrap">Storyteller</span>
    {(activeOrg || inProject) && (
      <span className="truncate text-muted-foreground">
        {activeOrg?.name}
        {inProject && (activeOrg ? " / " : "")}
        {inProject ? slug : ""}
        {pageLabel && <> · {pageLabel}</>}
      </span>
    )}
  </div>

  <div className="ml-2 flex max-w-md min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-input bg-card px-3 py-2 text-sm focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/25">
    <Search className="size-4 shrink-0 text-muted-foreground" />
    <input
      aria-label="Global search"
      placeholder="Search cards, keys, versions…"
      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
    />
    <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
      Ctrl K
    </kbd>
  </div>

  <div className="ml-auto flex shrink-0 items-center gap-2">
    <button
      aria-label="Notifications"
      className="relative grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Bell className="size-4.5" />
      <span className="bg-warn absolute top-2 right-2.5 size-1.5 rounded-full" />
    </button>
    {projectsLimited ? (
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex" data-testid="limit-tooltip" />}
        >
          {newBoardButton}
        </TooltipTrigger>
        <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
      </Tooltip>
    ) : (
      newBoardButton
    )}
    <EnvIndicator />
    {user && <UserMenu name={user.name} role={role} onLogout={logout} />}
  </div>
</header>
```

Update the `SidebarContent` call sites (desktop aside + mobile drawer) to pass `name={user?.name ?? ""} role={role} onLogout={logout}`.

The `Home` icon import is unused — do not import it. Keep only the icons used.

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
bun --filter web test -- --run src/components/__tests__/app-shell.test.tsx
bun run lint
bun run typecheck
```

Expected: all PASS. Note `UserMenu` now renders inside the sidebar footer — the existing "Sign out"/"admin" tests still pass because the dropdown is reachable via the trigger button.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/app-shell.tsx apps/web/src/components/__tests__/app-shell.test.tsx
git commit -m "feat(web): rebuild app shell to reference sidebar and topbar"
```

---

### Task 5: OrgSwitcher → reference org-switch

**Files:**

- Modify: `apps/web/src/components/org-switcher.tsx`

**Interfaces:**

- Consumes: `useOrgs`, `useBoardStore`.
- Produces: `OrgSwitcher` rendering a reference org-switch button + dropdown; same props (none).

- [ ] **Step 1: Rewrite OrgSwitcher**

Replace `apps/web/src/components/org-switcher.tsx`:

```tsx
import { useState } from "react"
import { useNavigate } from "react-router"
import { useOrgs } from "@/hooks/use-orgs"
import { useBoardStore } from "@/stores/board-store"
import { cn } from "@workspace/ui/lib/utils"
import { Check, ChevronDown, Plus } from "lucide-react"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function OrgSwitcher() {
  const { data: orgs, isLoading } = useOrgs()
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const setSelectedOrgId = useBoardStore((s) => s.setSelectedOrgId)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">Loading orgs...</p>
    )
  }
  if (!orgs || orgs.length === 0) {
    return (
      <button
        onClick={() => navigate("/onboarding")}
        className="mx-1 mb-3 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-2 text-left text-[13px] hover:border-primary"
      >
        <span className="grid size-6 place-items-center rounded-md bg-muted font-mono text-[10px] font-semibold text-primary">
          +
        </span>
        <span className="truncate font-semibold">Create organization</span>
      </button>
    )
  }

  const active = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0]

  return (
    <div className="relative px-1 pb-4">
      <button
        data-testid="org-switcher"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-input bg-background px-2.5 py-2 text-left text-[13px] transition-colors hover:border-primary",
          open && "border-primary"
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-[10px] font-semibold text-primary">
          {initials(active.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{active.name}</span>
          <span className="block text-[11px] text-muted-foreground capitalize">
            {active.role}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 rounded-xl border border-input bg-popover p-1.5 shadow-lg"
            data-testid="org-switcher-menu"
          >
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setSelectedOrgId(org.id)
                  setOpen(false)
                  navigate("/projects")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-foreground/80 hover:bg-background hover:text-foreground",
                  org.id === active.id &&
                    "bg-background font-semibold text-foreground"
                )}
              >
                <span className="grid size-5.5 shrink-0 place-items-center rounded-md bg-background font-mono text-[10px] text-muted-foreground">
                  {initials(org.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.id === active.id && (
                  <Check className="size-3.5 shrink-0 text-primary" />
                )}
              </button>
            ))}
            <button
              onClick={() => navigate("/onboarding")}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2 py-2 text-[13px] font-semibold text-primary"
            >
              <Plus className="size-4" />
              Create organization
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:

```bash
bun run lint
bun run typecheck
bun --filter web test -- --run src/components/__tests__/app-shell.test.tsx
```

Expected: PASS. The org switcher still shows org names, and clicking a name still selects it (existing `OrgSwitcher` test uses `getByText(/Acme/)` + click).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/org-switcher.tsx
git commit -m "feat(web): restyle org switcher as reference dropdown"
```

---

### Task 6: UserMenu → sidebar footer

**Files:**

- Modify: `apps/web/src/components/user-menu.tsx`

**Interfaces:**

- Consumes: `name`, `role`, `onLogout` props (unchanged).
- Produces: same props; renders a reference side-user footer row (avatar, name, role) whose trigger opens the existing dropdown.

- [ ] **Step 1: Rewrite UserMenu**

Replace `apps/web/src/components/user-menu.tsx` with a sidebar-footer style trigger:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Settings } from "lucide-react"

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
        render={
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-input bg-muted font-mono text-[11px] font-semibold text-primary">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">
                {name}
              </span>
              <span className="block text-[11px] text-muted-foreground capitalize">
                {role ?? "member"}
              </span>
            </span>
            <Settings className="size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="start" side="right" className="w-44">
        <DropdownMenuGroup>
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Verify**

Run:

```bash
bun run lint
bun run typecheck
bun --filter web test -- --run src/components/__tests__/app-shell.test.tsx
```

Expected: PASS. "Sign out" and "admin" still appear after opening the trigger (the trigger now shows the name directly, so `screen.getByText("Ada")` still resolves).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/user-menu.tsx
git commit -m "feat(web): restyle user menu as sidebar footer"
```

---

### Task 7: Priority chips → P0/P1/P2

**Files:**

- Modify: `apps/web/src/lib/priority.ts`
- Test: `apps/web/src/components/__tests__/board-card.test.tsx` (assert P label)

**Interfaces:**

- Produces:

```ts
priorityClasses: Record<string, string> // keyed by app priority (critical/high/medium/low)
priorityLabel: (p: string) => string // "P0" | "P1" | "P2" | ""
```

- [ ] **Step 1: Update the failing test**

In `apps/web/src/components/__tests__/board-card.test.tsx`, change the priority assertion (line 22):

```tsx
expect(screen.getByText("high")).toBeInTheDocument()
```

to:

```tsx
expect(screen.getByText("P1")).toBeInTheDocument()
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun --filter web test -- --run src/components/__tests__/board-card.test.tsx`
Expected: FAIL — "P1" not found.

- [ ] **Step 3: Implement**

Replace `apps/web/src/lib/priority.ts`:

```ts
export const priorityClasses: Record<string, string> = {
  critical: "border border-destructive/40 bg-destructive/10 text-destructive",
  high: "border border-warn/40 bg-warn/10 text-warn",
  medium: "border border-primary/40 bg-primary/10 text-primary",
  low: "border border-border bg-muted text-muted-foreground",
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case "critical":
      return "P0"
    case "high":
      return "P1"
    case "medium":
      return "P2"
    default:
      return ""
  }
}
```

- [ ] **Step 4: Verify it passes + keep graph node intact**

Run: `bun --filter web test -- --run src/components/__tests__/board-card.test.tsx`
Expected: PASS.

Note: `graph-node.tsx` currently renders the raw priority value in a chip. That is acceptable (chip shows "high"); if you want the P label there too, update `graph-node.tsx` to use `priorityLabel(data.priority ?? "")` alongside `priorityClasses`. Verify with `bun --filter web test`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/priority.ts apps/web/src/components/__tests__/board-card.test.tsx
git commit -m "feat(web): map priority to P0/P1/P2 chips"
```

---

### Task 8: Board card + column restyle

**Files:**

- Modify: `apps/web/src/components/board-card.tsx`
- Modify: `apps/web/src/components/board-column.tsx`
- Modify: `apps/web/src/components/kanban.tsx`
- Test: `apps/web/src/components/__tests__/board-card.test.tsx`

**Interfaces:**

- Consumes: `priorityClasses`, `priorityLabel` (Task 7), `BoardCard` type.
- Produces: same component props. `board-card` testid preserved. Cards show id, version chip, title, criteria/description, priority chip, footer.

- [ ] **Step 1: Update the test to assert new anatomy**

Append to `apps/web/src/components/__tests__/board-card.test.tsx`:

```tsx
it("renders the card id and footer meta", () => {
  render(<BoardCard card={card} isClosed={false} />)
  expect(screen.getByText("c1")).toBeInTheDocument()
  expect(screen.getByText("3 criteria")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun --filter web test -- --run src/components/__tests__/board-card.test.tsx`
Expected: FAIL — "c1" not rendered.

- [ ] **Step 3: Implement BoardCard**

Replace `apps/web/src/components/board-card.tsx`:

```tsx
import type { BoardCard } from "@/hooks/use-cards"
import { priorityClasses, priorityLabel } from "@/lib/priority"

export function BoardCard({
  card,
  isClosed,
  dragProps,
  onClick,
}: {
  card: BoardCard
  isClosed: boolean
  dragProps?: {
    ref: (element: Element | null) => void
    isDragging: boolean
    listeners?: Record<string, unknown>
  }
  onClick?: () => void
}) {
  const prio = priorityLabel(card.priority)
  return (
    <div
      data-testid="board-card"
      ref={dragProps?.ref}
      {...(dragProps?.listeners ?? {})}
      onClick={onClick}
      className={`group flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:-translate-y-px hover:border-border hover:shadow-lg ${
        isClosed
          ? "border-dashed border-destructive/40 bg-card/60 opacity-70"
          : ""
      } ${dragProps?.isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/80">
          {card.id}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
            isClosed
              ? "border border-border bg-muted text-muted-foreground"
              : "border-warn/40 bg-warn/10 text-warn border"
          }`}
        >
          {isClosed ? "frozen" : "proposed"}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          ›
        </span>
      </div>
      <p className="text-[13.5px] leading-snug font-semibold text-foreground">
        {card.title}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {card.acceptanceCriteriaCount > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {card.acceptanceCriteriaCount} criteria
          </span>
        )}
        {prio && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityClasses[card.priority] ?? priorityClasses.low}`}
          >
            {prio}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : ""}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Restyle BoardColumn**

Replace the card rendering + header in `apps/web/src/components/board-column.tsx`. Keep `DraggableBoardCard` internal, but move its markup into `BoardCard` by rendering `BoardCard` with drag props:

```tsx
import { useDroppable, useDraggable } from "@dnd-kit/react"
import type { BoardCard } from "@/hooks/use-cards"
import { BoardCard as Card } from "./board-card"

function DraggableBoardCard({
  card,
  onSelectCard,
}: {
  card: BoardCard
  onSelectCard: (card: BoardCard) => void
}) {
  const { ref, isDragging } = useDraggable({
    id: card.id,
    data: { cardId: card.id, status: card.status },
  })
  return (
    <Card
      card={card}
      isClosed={card.isClosed}
      dragProps={{ ref: ref as (el: Element | null) => void, isDragging }}
      onClick={() => onSelectCard(card)}
    />
  )
}

export function BoardColumn({
  columnKey,
  title,
  cards,
  onSelectCard,
}: {
  columnKey: string
  title: string
  cards: BoardCard[]
  onSelectCard: (card: BoardCard) => void
}) {
  const { ref, isDropTarget } = useDroppable({
    id: `col-${columnKey}`,
    data: { columnKey },
  })

  return (
    <div
      ref={ref}
      data-testid={`column-${columnKey}`}
      className={`flex min-h-[120px] flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-2 ${isDropTarget ? "ring-2 ring-ring" : ""}`}
    >
      <div className="flex items-center gap-2 px-1.5 py-1">
        <p className="text-[13px] font-bold tracking-wide text-foreground">
          {title}
        </p>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {cards.length}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {cards.length === 0 ? "no cards" : ""}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="p-3 text-center text-xs text-muted-foreground">
          No cards
        </p>
      ) : (
        cards.map((card) => (
          <DraggableBoardCard
            key={card.id}
            card={card}
            onSelectCard={onSelectCard}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: Tune kanban grid**

In `apps/web/src/components/kanban.tsx` line 35, change the grid container to a horizontally scrollable reference-style board:

```tsx
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
```

(Keep 3 visible on md, 5 on xl — matches reference multi-column board.)

- [ ] **Step 6: Verify**

Run:

```bash
bun --filter web test -- --run src/components/__tests__/board-card.test.tsx
bun run lint
bun run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/board-card.tsx apps/web/src/components/board-column.tsx apps/web/src/components/kanban.tsx apps/web/src/components/__tests__/board-card.test.tsx
git commit -m "feat(web): restyle board cards and columns to reference"
```

---

### Task 9: Closed rail → frozen rail

**Files:**

- Modify: `apps/web/src/components/closed-rail.tsx`

**Interfaces:**

- Consumes: `BoardCard[]`, `onSelectCard`, `useBoardStore` collapse toggle.
- Produces: same props; `closed-card` testid preserved; `closed-rail-toggle` preserved.

- [ ] **Step 1: Rewrite ClosedRail**

Replace `apps/web/src/components/closed-rail.tsx`:

```tsx
import type { BoardCard } from "@/hooks/use-cards"
import { useBoardStore } from "@/stores/board-store"
import { ChevronDown, Lock } from "lucide-react"

export function ClosedRail({
  cards,
  onSelectCard,
}: {
  cards: BoardCard[]
  onSelectCard: (card: BoardCard) => void
}) {
  const collapsed = useBoardStore((s) => s.closedRailCollapsed)
  const toggle = useBoardStore((s) => s.toggleClosedRail)
  const closedCards = cards.filter((c) => c.isClosed)

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-4">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 text-left"
        data-testid="closed-rail-toggle"
      >
        <Lock className="size-3.5 text-destructive" />
        <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          Frozen
        </span>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {closedCards.length}
        </span>
        <ChevronDown
          className={`ml-auto size-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
      {!collapsed && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {closedCards.length === 0 ? (
            <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
              No closed cards yet.
            </p>
          ) : (
            closedCards.map((card) => (
              <button
                key={card.id}
                data-testid="closed-card"
                onClick={() => onSelectCard(card)}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-destructive/40 bg-background px-3 py-2 text-left text-sm opacity-70 hover:opacity-100"
              >
                <span className="line-through decoration-destructive/60">
                  {card.title}
                </span>
                <span className="font-mono text-[10px] text-destructive">
                  frozen
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:

```bash
bun run lint
bun run typecheck
```

Expected: PASS. (No dedicated unit test; e2e `closed-card`/`closed-rail-toggle` selectors preserved.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/closed-rail.tsx
git commit -m "feat(web): restyle closed rail as frozen rail"
```

---

### Task 10: Project board — AI bar + proposal banner + header

**Files:**

- Modify: `apps/web/src/routes/project-board.tsx`

**Interfaces:**

- Consumes: `useProject`, `useCards`, `useMoveCard`, `useBoardStore`, `useProjectEvents`, `useExport`, `ProposalReview`, `CardDrawer`, `GraphView`, `LiveIndicator`, `ExportMenu`, `ProjectTabs`.
- Produces: unchanged route. Adds reference AI instruction bar (Run → `/projects/:slug/chat`) + proposal count from `useProposals`. `view-switcher-graph` testid must survive.

- [ ] **Step 1: Check existing ProposalReview/testid flow**

Read `apps/web/src/components/proposal-review.tsx` before editing to confirm it renders `proposal-item`/`approve-proposal` inside a panel with `data-testid="proposal-review"`. Do not change it in this task.

- [ ] **Step 2: Add imports + proposal count**

Add to `project-board.tsx`:

```tsx
import { useProposals } from "@/hooks/use-proposals"
import { Sparkles } from "lucide-react"
```

Inside `ProjectBoardPage`, add:

```tsx
const { data: proposals } = useProposals(slug)
const pendingCount =
  proposals?.filter((p) => p.status === "pending").length ?? 0
```

- [ ] **Step 3: Replace the header block**

Replace the block at lines 54-66:

```tsx
      <ProjectTabs slug={slug ?? ""} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {projectDetail?.project.name}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {cards?.length ?? 0} cards
          </span>
          <LiveIndicator status={events.status} onRetry={events.reconnect} />
        </div>
      </div>
```

with:

```tsx
      <ProjectTabs slug={slug ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
            {projectDetail?.project.name}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {cards?.length ?? 0} cards ·{" "}
            {pendingCount} proposed ·{" "}
            {cards?.filter((c) => c.isClosed).length ?? 0} frozen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator status={events.status} onRetry={events.reconnect} />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-3 py-2.5">
        <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold tracking-wide text-primary">
          <Sparkles className="size-4" />
          AI Instruction
        </span>
        <span className="hidden shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[11px] text-foreground/80 md:inline">
          forks a new branch off the active board
        </span>
        <input
          aria-label="AI instruction"
          placeholder="Ask the engine to draft, split, or evolve a requirement…"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <Button size="sm" onClick={() => navigate(`/projects/${slug ?? ""}/chat`)}>
          Run
        </Button>
      </div>

      {pendingCount > 0 && (
        <div
          data-testid="proposal-banner"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5"
        >
          <span className="font-mono text-[13px] font-bold text-warn">
            {pendingCount}
          </span>
          <span className="text-[13px] text-foreground/80">
            AI proposals awaiting your review.
          </span>
          <span className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById("proposal-review")?.scrollIntoView({ behavior: "smooth" })}
            >
              Review &amp; approve
            </Button>
          </span>
        </div>
      )}
```

- [ ] **Step 4: Verify**

Run:

```bash
bun run lint
bun run typecheck
bun --filter web test
```

Expected: PASS. Existing tests don't render `project-board` directly.

Note: `document.getElementById("proposal-review")` requires `ProposalReview` to render an element with `id="proposal-review"`. Check `proposal-review.tsx`; if it uses `data-testid` only, add `id="proposal-review"` to its root div in a follow-up edit within this task (it already has `data-testid="proposal-review"`, so add the id attribute alongside).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/project-board.tsx apps/web/src/components/proposal-review.tsx
git commit -m "feat(web): add reference AI bar and proposal banner to board"
```

---

### Task 11: Card drawer restyle

**Files:**

- Modify: `apps/web/src/components/card-drawer.tsx`
- Test: `apps/web/src/components/__tests__/card-drawer.test.tsx`

**Interfaces:**

- Consumes: existing hooks + `DiffPanel` (Task 12).
- Produces: unchanged props; `card-drawer-title`, `history-tab`, `close-card`, `copy-link`, `similar-list`, `new-comments-pill` testids preserved.

- [ ] **Step 1: Read the existing drawer test**

Read `apps/web/src/components/__tests__/card-drawer.test.tsx` to know which assertions exist. Do not change its assertions.

- [ ] **Step 2: Restyle drawer shell**

In `apps/web/src/components/card-drawer.tsx`, update the outer container (lines 106-108):

```tsx
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-input bg-background shadow-2xl">
```

Replace the header block (lines 109-145) with a reference-style drawer head that keeps the same buttons/testids:

```tsx
<div className="flex items-start justify-between gap-3 border-b border-border p-5">
  <div className="min-w-0">
    <div className="flex items-center gap-2">
      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
        {card.id}
      </span>
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
          card.isClosed
            ? "border border-destructive/40 bg-destructive/10 text-destructive"
            : "border-warn/40 bg-warn/10 text-warn border"
        }`}
      >
        {card.isClosed ? "frozen" : card.status}
      </span>
    </div>
    <p
      className="mt-1 text-lg leading-snug font-bold tracking-tight"
      data-testid="card-drawer-title"
    >
      {card.title}
    </p>
  </div>
  <div className="flex shrink-0 items-center gap-2">
    {!card.isClosed && (
      <Button
        size="sm"
        variant="outline"
        data-testid="close-card"
        disabled={closeCard.isPending}
        onClick={() => closeCard.mutate({ cardId: card.id })}
      >
        {closeCard.isPending ? "Closing..." : "Close card"}
      </Button>
    )}
    <Button
      size="sm"
      variant="outline"
      onClick={copyLink}
      data-testid="copy-link"
    >
      {copied ? "Copied!" : "Copy link"}
    </Button>
    <Button size="sm" variant="ghost" onClick={onClose}>
      ✕
    </Button>
  </div>
</div>
```

Keep the closed banner (lines 147-151), restyled:

```tsx
{
  card.isClosed && (
    <div className="border-b border-dashed border-destructive/40 bg-destructive/10 px-5 py-2 text-xs text-destructive">
      🔒 This card is closed and read-only.
    </div>
  )
}
```

Restyle the tabs row (lines 153-168) — keep the `history-tab` testid:

```tsx
<div className="flex gap-1 border-b border-border px-4 pt-3">
  {tabs.map((t) => (
    <button
      key={t.key}
      onClick={() => setTab(t.key)}
      data-testid={t.key === "history" ? "history-tab" : undefined}
      className={`rounded-t-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-wide uppercase ${
        tab === t.key
          ? "border border-b-0 border-border bg-background text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {t.label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Restyle body blocks**

Replace the section label paragraphs (`mb-1 text-sm font-semibold`) inside the body with reference-style block labels. Example for acceptance criteria:

```tsx
<div>
  <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
    Acceptance criteria
  </p>
  <ul className="space-y-1 text-sm">
    {card.acceptanceCriteria.map((c, i) => (
      <li key={i} className="flex gap-2">
        <span className="text-primary">☐</span>
        <span>{c}</span>
      </li>
    ))}
  </ul>
</div>
```

Apply the same label style to: "Custom fields", "Attachments", "Comments", "Acceptance criteria". The comments section keeps `new-comments-pill` testid.

- [ ] **Step 4: Verify**

Run:

```bash
bun --filter web test -- --run src/components/__tests__/card-drawer.test.tsx
bun run lint
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/card-drawer.tsx
git commit -m "feat(web): restyle card drawer to reference"
```

---

### Task 12: Diff panel restyle

**Files:**

- Modify: `apps/web/src/components/diff-panel.tsx`
- Test: `apps/web/src/components/__tests__/diff-panel.test.tsx`

**Interfaces:**

- Consumes: `before`, `after` strings.
- Produces: unchanged props; `diff-panel` testid preserved; "No changes." text preserved.

- [ ] **Step 1: Rewrite DiffPanel**

Replace `apps/web/src/components/diff-panel.tsx` with a reference row-based diff (add/del rows with gutters):

```tsx
import { useMemo } from "react"
import { diffLines } from "diff"

export function DiffPanel({
  before,
  after,
}: {
  before: string
  after: string
}) {
  const parts = useMemo(() => {
    return diffLines(before ?? "", after ?? "").map((part, i) => ({
      id: i,
      value: part.value,
      added: !!part.added,
      removed: !!part.removed,
    }))
  }, [before, after])

  if (!before && !after) {
    return (
      <p data-testid="diff-panel" className="text-xs text-muted-foreground">
        No changes.
      </p>
    )
  }

  return (
    <div
      data-testid="diff-panel"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {parts.map((part) => (
        <div
          key={part.id}
          className={`flex items-baseline gap-2 px-3 py-1 text-[13px] leading-relaxed ${
            part.added
              ? "bg-success/10"
              : part.removed
                ? "bg-destructive/10"
                : ""
          }`}
        >
          <span
            className={`w-5 shrink-0 text-right font-mono text-[10px] ${
              part.added
                ? "text-success"
                : part.removed
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {part.added ? "+" : part.removed ? "−" : " "}
          </span>
          <span
            className={
              part.added
                ? "text-foreground"
                : part.removed
                  ? "text-muted line-through decoration-destructive/50"
                  : "text-muted-foreground"
            }
          >
            {part.value}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run:

```bash
bun --filter web test -- --run src/components/__tests__/diff-panel.test.tsx
bun run lint
bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/diff-panel.tsx
git commit -m "feat(web): restyle diff panel to reference rows"
```

---

### Task 13: Graph restyle

**Files:**

- Modify: `apps/web/src/components/graph-canvas.tsx`
- Modify: `apps/web/src/components/graph-node.tsx`
- Modify: `apps/web/src/components/graph-edge.tsx`

**Interfaces:**

- Consumes: existing `GraphNodeData`/`GraphEdgeData` (unchanged).
- Produces: unchanged props; testids `graph-canvas`, `graph-node-{id}`, `graph-edge-{a}--{b}` preserved.

- [ ] **Step 1: Restyle GraphCanvas**

In `apps/web/src/components/graph-canvas.tsx`, replace the outer container div (line 20):

```tsx
    <div data-testid="graph-canvas" className="h-[560px]">
```

with a reference dotted-grid panel:

```tsx
    <div
      data-testid="graph-canvas"
      className="h-[560px] overflow-hidden rounded-2xl border border-border bg-card [background-image:radial-gradient(circle,rgba(142,160,184,0.14)_1px,transparent_1px)] [background-size:26px_26px]"
    >
```

- [ ] **Step 2: Restyle GraphNode**

In `apps/web/src/components/graph-node.tsx`, replace `base`/`stateClasses` (lines 23-33) with reference styling. Keep the `data-testid` and impact/dim logic:

```tsx
const isEpic = data.kind === "epic"
const isImpacted = Boolean(data.isImpacted)
const dimmed = Boolean(data.dimmed)
const highlighted = isImpacted || selected

const base = isEpic
  ? "w-[160px] rounded-lg border-2 border-primary/40 bg-card px-3 py-2"
  : "w-[140px] rounded-lg border bg-card px-3 py-2 shadow-sm"

const stateClasses = [
  !isEpic && data.isClosed
    ? "border-dashed border-destructive/50 opacity-75"
    : "",
  dimmed ? "opacity-25" : "",
  highlighted ? "ring-2 ring-primary border-primary" : "",
]
  .filter(Boolean)
  .join(" ")
```

Add a status dot in the top-right corner of the card node (after the `<p>` for card nodes):

```tsx
<span
  className={`absolute top-2 right-2 size-2 rounded-full border-2 border-background ${
    data.isClosed ? "bg-destructive" : "bg-warn"
  }`}
/>
```

The wrapping node div needs `relative` — append it to `base`:

```tsx
const base = isEpic
  ? "relative w-[160px] rounded-lg border-2 border-primary/40 bg-card px-3 py-2"
  : "relative w-[140px] rounded-lg border bg-card px-3 py-2 shadow-sm"
```

Update the priority chip in the card node to use `priorityLabel`:

```tsx
import { priorityClasses, priorityLabel } from "@/lib/priority"
...
            {data.priority && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityClasses[data.priority] ?? priorityClasses.low}`}
              >
                {priorityLabel(data.priority)}
              </span>
            )}
```

- [ ] **Step 3: Restyle GraphEdge**

In `apps/web/src/components/graph-edge.tsx`, the edge colors already come from `--edge-*` vars which Task 1 recolored to accent/hierarchy/evolution. No change required. Optionally add a dashed style for evolution edges in `edgeStrokeVar` consumers — skip; keep behavior.

- [ ] **Step 4: Verify**

Run:

```bash
bun --filter web test -- --run src/hooks/__tests__/use-graph.test.tsx
bun run lint
bun run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/graph-canvas.tsx apps/web/src/components/graph-node.tsx
git commit -m "feat(web): restyle graph canvas and nodes to reference"
```

---

### Task 14: Landing rebuild

**Files:**

- Modify: `apps/web/src/routes/landing.tsx`

**Interfaces:**

- Consumes: `Link`, `Button`.
- Produces: `LandingPage` mirroring `landing.html`. Must keep the "Get started" link (e2e `getByRole("link", { name: "Get started" })`).

- [ ] **Step 1: Write a light smoke test**

Create `apps/web/src/routes/__tests__/landing.test.tsx`:

```tsx
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { LandingPage } from "../landing"

describe("LandingPage", () => {
  it("renders the hero CTA links", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("link", { name: "Get started" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun --filter web test -- --run src/routes/__tests__/landing.test.tsx`
Expected: FAIL — "Get started" link missing from current landing.

- [ ] **Step 3: Rebuild LandingPage**

Replace `apps/web/src/routes/landing.tsx` with a faithful React port of `landing.html`. Use `Link` for routes and lucide icons for the feature tiles:

```tsx
import { useState } from "react"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  ArrowRight,
  CircleCheckBig,
  Lock,
  Search,
  Sparkles,
} from "lucide-react"

const features = [
  {
    title: "Living Requirements Engine",
    body: "Instruct the AI in plain English. It generates or refines requirement cards, proposes a side-by-side diff, and waits for your approval — never edits silently.",
    kicker: "Instruct → Propose → Approve",
    icon: Sparkles,
    tint: "text-primary",
  },
  {
    title: "Immutable History",
    body: "Every approved card is frozen in a rail and becomes permanently immutable. Past decisions can't be quietly edited — only deliberately replaced, with lineage preserved.",
    kicker: "Freeze → Replace → Trace",
    icon: Lock,
    tint: "text-destructive",
  },
  {
    title: "Graph View & Lineage Map",
    body: "See how every requirement relates. Active nodes in focus, frozen legacy in dashed red, with dependency arrows and glowing evolution paths between replacements.",
    kicker: "Zoom · Filter · Export",
    icon: CircleCheckBig,
    tint: "text-success",
  },
  {
    title: "Semantic Recall",
    body: "Similar and contextually related cards are surfaced automatically so new proposals never contradict the frozen decisions your team has already made.",
    kicker: "Vector index · healthy",
    icon: Search,
    tint: "text-warn",
  },
]

const steps = [
  {
    n: "01",
    title: "Describe the prompt",
    body: "Type what should change or what new requirement you need, in your own words.",
    pill: "natural language",
    color: "bg-primary",
  },
  {
    n: "02",
    title: "AI generates the card",
    body: "Storyteller drafts the story, acceptance criteria, and a proposed diff — as a reviewable proposal, never a silent edit.",
    pill: "side-by-side diff",
    color: "bg-sky-400",
  },
  {
    n: "03",
    title: "Approve changes",
    body: "Review, tweak, and approve. The approver and timestamp are written to the immutable audit trail.",
    pill: "audit-ready",
    color: "bg-success",
  },
  {
    n: "04",
    title: "Track evolution",
    body: "Each approved change freezes a version. Follow lineage across graph and clone as your product grows.",
    pill: "graph + frozen rail",
    color: "bg-warn",
  },
]

const demoBank = [
  {
    t: "Export past invoices",
    s: "Add a CSV export action to the invoice table.",
  },
  {
    t: "Approval notifications",
    s: "Email each member when a proposal is awaiting review.",
  },
  {
    t: "Frozen archive",
    s: "Keep the last frozen clone of every shipped layout.",
  },
  {
    t: "Semantic recall",
    s: "Auto-suggest similar older requirements at proposal time.",
  },
  { t: "Single sign-on", s: "Support Okta/Entra for read-only viewers." },
]

type DemoCard = { id: string; title: string; sub: string }

export function LandingPage() {
  const [demoInput, setDemoInput] = useState("")
  const [demoCards, setDemoCards] = useState<DemoCard[]>([
    {
      id: "REQ-096",
      title: "Export past invoices",
      sub: "Add a CSV/CSV download action to the invoice table.",
    },
    {
      id: "REQ-097",
      title: "Chart export",
      sub: "Allow export of dashboard charts as PNG snapshots.",
    },
  ])

  function runDemo() {
    const next: DemoCard[] = []
    if (demoInput.trim()) {
      next.push({
        id: `REQ-${100 + next.length}`,
        title: demoInput.trim(),
        sub: "New AI-proposed requirement card.",
      })
    }
    const roll = demoBank[Math.floor(Math.random() * demoBank.length)]
    next.push({
      id: `REQ-${100 + Math.floor(Math.random() * 90) + 1}`,
      title: roll.t,
      sub: `${roll.t} — ${roll.s}`,
    })
    setDemoCards((prev) => [...next, ...prev].slice(0, 5))
    setDemoInput("")
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-8 px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-base font-bold"
          >
            <span className="grid size-6.5 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="size-4"
              >
                <path d="M13 2 3 14h6l-2 8 10-12h-6l2-8z" />
              </svg>
            </span>
            Storyteller
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#demo" className="hover:text-foreground">
              Live demo
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-6">
        <section className="relative overflow-hidden py-20 [background:radial-gradient(120%_120%_at_20%_0%,#16233f_0%,transparent_55%)] md:py-24">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 font-mono text-xs text-foreground/80">
              <span className="bg-success size-1.5 rounded-full shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" />
              AI-native requirements engine · v2.0
            </span>
            <h1 className="mt-6 max-w-[760px] text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
              Turn plain English ideas into{" "}
              <span className="text-primary">living, auditable</span>{" "}
              requirement boards.
            </h1>
            <p className="mt-5 max-w-[600px] text-lg text-muted-foreground">
              Storyteller turns natural-language prompts into
              version-controlled, AI-proposed requirement cards — with immutable
              history, evolution lineage, and a full audit trail on every frozen
              decision.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/signup">
                <Button size="lg">
                  Start building free
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#demo">
                <Button variant="outline" size="lg">
                  See the live demo
                </Button>
              </a>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">
              Free for 3 members ·{" "}
              <b className="font-medium text-foreground/80">Own every line</b>{" "}
              of your requirement history
            </p>

            <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border/60 bg-secondary px-4 py-3">
                <span className="flex gap-1.5">
                  <i className="size-2.5 rounded-full bg-destructive/70" />
                  <i className="bg-warn/70 size-2.5 rounded-full" />
                  <i className="bg-success/70 size-2.5 rounded-full" />
                </span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  storyteller — prompt → board
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3.5">
                  <Sparkles className="size-4.5 shrink-0 text-primary" />
                  <span className="text-[15px] font-medium text-foreground/90">
                    Add a 'Pay with Stripe' checkout step before order
                    confirmation
                  </span>
                  <span className="ml-auto shrink-0 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
                    v1.3 · draft
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <div className="flex justify-between">
                      <span className="text-warn font-mono text-[10px] font-semibold">
                        DRAFT
                      </span>
                      <span className="font-mono text-[11px] text-primary">
                        REQ-088
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      Stripe checkout
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Accept payment before order is confirmed.
                    </p>
                    <div className="mt-2.5 flex gap-1.5">
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        payment
                      </span>
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        v1.0
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] font-semibold text-primary">
                        PROPOSED
                      </span>
                      <span className="font-mono text-[11px] text-primary">
                        REQ-102
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">Payment gate</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      AI proposes Stripe + PayPal alternatives.
                    </p>
                    <div className="mt-2.5 flex gap-1.5">
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        payment
                      </span>
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        v1.2
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <div className="flex justify-between">
                      <span className="text-success font-mono text-[10px] font-semibold">
                        APPROVED
                      </span>
                      <span className="font-mono text-[11px] text-primary">
                        REQ-104
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">Checkout flow</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Customer confirms order via Stripe.
                    </p>
                    <div className="mt-2.5 flex gap-1.5">
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        frozen
                      </span>
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        v2.1
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20">
          <div className="max-w-[640px]">
            <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
              Core system
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Four capabilities that make requirements trustworthy.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Built for teams where requirements are legal-grade assets — not
              scratch notes.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-border"
              >
                <span
                  className={`grid size-10.5 place-items-center rounded-xl border border-border bg-secondary ${f.tint}`}
                >
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                <p className="mt-4 font-mono text-xs font-medium text-muted-foreground">
                  {f.kicker}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="pb-20">
          <div className="max-w-[640px]">
            <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
              Sandbox
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Try it before you sign up.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Type any product idea below and watch it become a set of
              AI-proposed requirement cards.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-border/60 bg-card p-6">
            <div className="grid gap-6 md:grid-cols-[340px_1fr]">
              <div>
                <h3 className="text-lg font-semibold">Prompt the engine</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The same bar that runs your real board — same generation, no
                  data touched.
                </p>
                <label className="mt-5 block font-mono text-xs font-medium tracking-[0.1em] text-foreground/80 uppercase">
                  Your idea
                </label>
                <textarea
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runDemo()
                  }}
                  placeholder="e.g. Let users export a CSV of their past approvals…"
                  className="mt-2 min-h-[92px] w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                />
                <Button className="mt-3.5" onClick={runDemo}>
                  Generate cards
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              <div className="border-l border-border/60 pl-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                    Output
                  </span>
                  <span className="inline-flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                    <span className="size-1.5 rounded-full bg-primary" /> live
                  </span>
                </div>
                <div className="space-y-2.5">
                  {demoCards.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-background px-3.5 py-3"
                    >
                      <span className="w-14 shrink-0 font-mono text-[11px] text-primary">
                        {c.id}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {c.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.sub}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-primary">
                        Proposed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="pb-20">
          <div className="max-w-[640px]">
            <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
              Workflow
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              From idea to frozen decision in four steps.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-border/60 bg-card p-5"
              >
                <span
                  className={`absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl ${s.color}`}
                />
                <span className="font-mono text-2xl font-bold text-primary/50">
                  {s.n}
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {s.body}
                </p>
                <span className="mt-3 inline-block rounded border border-border px-2 py-0.5 font-mono text-[11px] text-foreground/80">
                  {s.pill}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <div className="rounded-2xl border border-border/60 bg-card px-6 py-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Your requirements deserve better than a doc.
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] text-muted-foreground">
              Start a board in minutes. Approve with confidence. Trace every
              decision back.
            </p>
            <Link to="/signup" className="mt-7 inline-block">
              <Button size="lg">Create your first board</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-[280px]">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-base font-bold"
              >
                <span className="grid size-6.5 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className="size-4"
                  >
                    <path d="M13 2 3 14h6l-2 8 10-12h-6l2-8z" />
                  </svg>
                </span>
                Storyteller
              </Link>
              <p className="mt-3 text-[13px] text-muted-foreground">
                The living, auditable requirements engine — trusted where
                decisions are frozen for good.
              </p>
              <span className="border-success/40 bg-success/10 text-success mt-4 inline-flex items-center gap-2 rounded border px-2 py-1 font-mono text-[11px]">
                <span className="bg-success size-1.5 rounded-full" />
                All systems operational
              </span>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div>
                <h4 className="mb-3 text-[13px] font-semibold">Product</h4>
                <a
                  href="#features"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Features
                </a>
                <Link
                  to="/dashboard"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  to="/projects"
                  className="block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Board view
                </Link>
              </div>
              <div>
                <h4 className="mb-3 text-[13px] font-semibold">Legal</h4>
                <a
                  href="#features"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Privacy
                </a>
                <a
                  href="#features"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Terms
                </a>
                <a
                  href="#features"
                  className="block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Security
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            <span>© 2026 Storyteller Systems, Inc.</span>
            <span>Built on pgvector · Postgres · AI review pipelines</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `bun --filter web test -- --run src/routes/__tests__/landing.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify**

Run:

```bash
bun run lint
bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/routes/landing.tsx apps/web/src/routes/__tests__/landing.test.tsx
git commit -m "feat(web): rebuild landing page to reference design"
```

---

### Task 15: Auth shell + auth routes

**Files:**

- Modify: `apps/web/src/components/auth-shell.tsx`
- Modify: `apps/web/src/routes/login.tsx`
- Modify: `apps/web/src/routes/signup.tsx`
- Modify: `apps/web/src/routes/forgot-password.tsx`
- Modify: `apps/web/src/routes/reset-password.tsx`
- Modify: `apps/web/src/routes/verify-email.tsx`
- Tests: existing `apps/web/src/routes/__tests__/{login,signup,forgot-password,reset-password,verify-email}.test.tsx` — do not change assertions.

**Interfaces:**

- Consumes: existing auth forms + `signIn`.
- Produces: `AuthShell` accepting `title`, `description`, `children` (unchanged) with reference auth-card styling. Auth labels "Name"/"Email"/"Password"/"Confirm password" and buttons "Sign in"/"Create account" must remain reachable (getByLabel/getByRole).

- [ ] **Step 1: Rewrite AuthShell**

Replace `apps/web/src/components/auth-shell.tsx`:

```tsx
import type { ReactNode } from "react"
import { Link } from "react-router"

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
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 [background:radial-gradient(620px_320px_at_82%_8%,rgba(96,165,250,0.13),transparent_60%),radial-gradient(480px_260px_at_8%_88%,rgba(96,165,250,0.06),transparent_60%)]"
      />
      <header className="relative flex items-center justify-between px-7 py-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[15px] font-bold"
        >
          <span className="grid size-6.5 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className="size-4"
            >
              <path d="M13 2 3 14h6l-2 8 10-12h-6l2-8z" />
            </svg>
          </span>
          Storyteller
        </Link>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          ← Back to site
        </Link>
      </header>
      <main className="relative grid flex-1 place-items-center px-6 pb-16">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[21px] font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 mb-5 text-[13.5px] text-muted-foreground">
              {description}
            </p>
          )}
          <div className="rounded-2xl border border-input bg-card px-7 py-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Update auth route labels**

In each auth route, replace the `Label`/`Input` combos so labels are uppercase mono and inputs keep `id`/association. Example for `login.tsx` fields:

```tsx
<div className="space-y-1.5">
  <Label
    htmlFor="email"
    className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
  >
    Email
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="you@company.com"
    className="h-10.5 rounded-[10px] border-input bg-background"
    {...form.register("email")}
  />
  {form.formState.errors.email && (
    <p className="text-xs text-destructive">
      {form.formState.errors.email.message}
    </p>
  )}
</div>
```

Apply the same label style to password fields and to `signup.tsx` (Name, Email, Password, Confirm password), `forgot-password.tsx` (Email), `reset-password.tsx` (Password, Confirm password), `verify-email.tsx` (code input). Keep every `id` and `getByLabel` association intact. Keep submit buttons text exactly "Sign in" / "Create account" / "Send reset link" / "Reset password" / "Verify".

- [ ] **Step 3: Verify**

Run:

```bash
bun --filter web test -- --run src/routes/__tests__/login.test.tsx --run src/routes/__tests__/signup.test.tsx --run src/routes/__tests__/forgot-password.test.tsx --run src/routes/__tests__/reset-password.test.tsx --run src/routes/__tests__/verify-email.test.tsx
bun run lint
bun run typecheck
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/auth-shell.tsx apps/web/src/routes/login.tsx apps/web/src/routes/signup.tsx apps/web/src/routes/forgot-password.tsx apps/web/src/routes/reset-password.tsx apps/web/src/routes/verify-email.tsx
git commit -m "feat(web): restyle auth shell and routes to reference"
```

---

### Task 16: Secondary pages audit

**Files:**

- Inspect/modify: `apps/web/src/routes/{onboarding,billing,analytics,org-members}.tsx`, `apps/web/src/routes/project-chat.tsx`

**Interfaces:**

- Consumes: none new.
- Produces: no API changes; token inheritance polish only.

- [ ] **Step 1: Grep for hardcoded light-mode classes**

Run:

```bash
grep -rn "bg-white\|text-black\|bg-zinc\|border-zinc" apps/web/src/routes apps/web/src/components
```

Expected: fix any hits in these files by swapping to token utilities (`bg-card`, `text-foreground`, `border-border`).

- [ ] **Step 2: Fix hits**

For each hit, replace with the shadcn token equivalent. Example:

- `bg-white` → `bg-background`
- `text-black` → `text-foreground`
- `border-zinc-200` → `border-border`
- `bg-zinc-50` → `bg-muted`

- [ ] **Step 3: Verify**

Run:

```bash
bun run lint
bun run typecheck
bun --filter web test
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes apps/web/src/components
git commit -m "style(web): swap hardcoded light-mode classes for theme tokens"
```

---

### Task 17: Full verification + e2e

**Files:** none (verification only)

- [ ] **Step 1: Full unit + lint + typecheck**

Run:

```bash
bun run lint
bun run typecheck
bun --filter web test
```

Expected: all PASS.

- [ ] **Step 2: Grep for leftover light-mode artifacts**

Run:

```bash
grep -rn "bg-white\|text-black\|ThemeToggle\|theme-toggle\|class=\"light\"\|classList.*light" apps/web/src apps/web/index.html
```

Expected: no output.

- [ ] **Step 3: Run e2e (if services available)**

Run: `bun --filter e2e test` (requires the stack from `docker-compose.yml` + dev server). If infra is not running, note it and defer; unit/lint/typecheck are the gate.

- [ ] **Step 4: Commit any stragglers**

```bash
git add -A
git status
git commit -m "style(web): finish dashboard redesign polish"
```

---

## Self-Review

**Spec coverage:**

- Tokens + fonts → Task 1
- Dark-only + toggle removal → Task 2
- AppShell sidebar/topbar → Tasks 3-6
- Board cards/columns/frozen rail → Tasks 7-9
- AI bar + proposal banner → Task 10
- Card drawer + diff → Tasks 11-12
- Graph → Task 13
- Landing → Task 14
- Auth → Task 15
- Secondary pages → Task 16
- No new routes → Task 10 (Run → chat)
- e2e selector preservation → Global Constraints + per-task notes

**Placeholder scan:** All steps carry concrete code or exact commands. No TBD/TODO.

**Type consistency:** `priorityLabel` defined in Task 7, consumed in Tasks 7-8 and 13. `LucideIcon` icons added in Task 3, consumed in Task 4. `OrgSwitcher`/`UserMenu` props unchanged across tasks.
