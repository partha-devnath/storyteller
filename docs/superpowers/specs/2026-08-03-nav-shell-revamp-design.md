# Navigation & App Shell Revamp

Date: 2026-08-03

## Goal

Fix the navigation and layout defects in the Storyteller web app: dead mobile nav,
duplicate "Chat" nav item, overstuffed header, debug dashboard, blank card-detail
page, and z-index conflicts. Revamp the app shell, navigation, auth pages, and
landing page with a polished neutral enterprise aesthetic — without a visual
rebrand.

## Design principles (from research)

Clear navigation with logical grouping + breadcrumbs; aggressive cognitive-load
reduction via progressive disclosure; one consistent design system (shadcn);
dense-but-clear grids with strict hierarchy; keyboard-first; consistent copy.

## Current problems

1. Sidebar `hidden md:block` — hamburger does nothing on mobile, zero nav below `md`.
2. `navItems` — "Boards" and "Chat" both target `/projects`; both NavLinks light up
   active on board routes. Real chat route `/projects/:slug/chat` never linked.
3. Header overstuffing — brand + org + "New board" + env badge + role + name + sign
   out all inline in `h-14`; no truncation, collides on small screens.
4. `dashboard.tsx` — debug page rendering a second full-viewport layout + duplicate
   sidebar toggle + duplicate sign-out inside the shell.
5. `card-detail.tsx` — renders only a fixed drawer; closing it leaves a blank page.
6. Toaster and CardDrawer both `z-50` — toasts appear above modal backdrop.
7. No visible theme toggle (keyboard `d` only).
8. Raw HTML where shadcn exists (`org-members` table/select, `projects` button).

## Design

### Navigation model

Sidebar with two labeled sections under an org switcher:

```
Workspace
  Boards            → /projects
Org
  Members           → /orgs/:orgId/members
  Billing           → /orgs/:orgId/billing
  Analytics         → /orgs/:orgId/analytics
```

Remove the fake "Chat" nav item. Chat becomes a project-level tab (below).

### Header

Left: mobile-only hamburger + breadcrumb `Org / Project · Page` (truncated).
Right: "New board" button, `EnvIndicator`, visible theme toggle, compact user
`DropdownMenu` (name, role, sign out). No inline sign-out.

### Mobile

Sidebar renders as a slide-in drawer below `md`: backdrop, Escape/backdrop/route
change closes it, `z-50`. `md+`: persistent, always open. `app-store.sidebarOpen`
remains the single source of truth.

### Project context

Project tab bar under the header inside a project: `Board | Graph | Chat`. Board
and Graph map to the existing view-switcher state; Chat links
`/projects/:slug/chat`. Breadcrumb shows `Org / Project`.

### Page fixes

| Page              | Fix                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------ |
| `dashboard.tsx`   | Delete debug page; `/dashboard` redirects to `/projects`                             |
| `card-detail.tsx` | Drawer close → navigate back to `/projects/:slug`; fallback content instead of blank |
| Toaster           | `z-[60]`                                                                             |
| Auth pages        | Consistent header/logo, tightened spacing, matching card shell, consistent copy      |
| Landing           | Type scale, spacing, button-hierarchy polish                                         |
| Theme toggle      | Visible header control                                                               |

## Scope

In first pass: app shell, navigation, auth pages, landing, dashboard, card-detail,
toaster. Deep redesign of board/graph/chat/billing internals is NOT in this pass
(only structural integration of project tabs).

## Verification

- `bun run typecheck`, `bun run lint` pass.
- `bun --filter web build` passes.
- E2E core journeys pass (login → projects → board → chat), full suite green.
- Manual: mobile drawer opens/closes; nav has no duplicate active state; header
  does not overflow at 360px; card-detail close returns to board.
