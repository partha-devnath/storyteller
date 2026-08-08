# Story-SaaS-Dashboard Redesign

Date: 2026-08-08

## Goal

Rebrand the Storyteller web app to the dark-navy design system defined in
`C:\Users\USER\Downloads\Story-SaaS-Dashboard` (landing.html, auth.html,
workspace-home.html, storyteller-workspace.html, evolution-graph.html, and
sibling mockups). Full faithful restyle: palette, typography, sidebar/topbar
shell, board cards, frozen rail, proposal banner, graph nodes, card drawer,
landing, and auth — all on the existing React / Tailwind v4 / shadcn /
@workspace/ui stack. No backend, routing, or data-contract changes.

## Decisions (confirmed with user)

1. **Fidelity**: Full faithful restyle (approach B). Token layer + component
   rebuild; no direct HTML port.
2. **Theme**: Dark-only. Reference palette becomes `:root`. Drop light theme +
   theme toggle. Remove ThemeProvider light/dark logic; pin dark.
3. **Fonts**: Keep Inter Variable for body; add JetBrains Mono for
   mono/code/IDs/version chips. `--font-mono` points at it.
4. **Landing**: Rebuilt to mirror landing.html (hero + prompt→board simulator,
   feature grid, sandbox demo, 4-step workflow, CTA band, footer).
5. **AppShell + board**: Full rebuild to reference layout.
6. **Secondary pages** (onboarding, billing, analytics, org-members,
   project-chat): token recolor + light polish only; not in reference, no
   rebuild.
7. **No new routes**: Reference-only pages (library, lineage, version-history,
   org-settings, member-directory, docs, changelog, api-reference) are NOT
   added. Sidebar nav maps reference labels onto existing routes where they
   exist.

## Design

### 1. Design tokens (`packages/ui/src/styles/globals.css`)

Reference hex palette mapped to shadcn CSS variables. Dark-only: `:root`
holds the palette; remove light `:root` block and `.dark` overrides.

| Role          | Reference | CSS var                                                                 |
| ------------- | --------- | ----------------------------------------------------------------------- |
| background    | `#0b1020` | `--background`                                                          |
| surface       | `#131b2f` | `--card`, `--popover`, `--sidebar`                                      |
| surface-warm  | `#182343` | `--secondary`, `--muted`, `--accent`, `--sidebar-accent`                |
| fg            | `#f8fafc` | `--foreground`                                                          |
| fg-2          | `#cbd5e1` | `--secondary-foreground`, `--accent-foreground`, `--sidebar-foreground` |
| muted         | `#8ea0b8` | `--muted-foreground`                                                    |
| accent / meta | `#60a5fa` | `--primary`, `--ring`, `--sidebar-primary`                              |
| accent-on     | `#06111f` | `--primary-foreground`, `--sidebar-primary-foreground`                  |
| border        | `#293653` | `--border`, `--input`                                                   |
| border-soft   | `#1e2a43` | `--sidebar-border`                                                      |
| danger        | `#fb7185` | `--destructive`                                                         |
| success       | `#22c55e` | new `--success` (+ `--color-success` utility)                           |
| warn          | `#fbbf24` | new `--warn` (+ `--color-warn` utility)                                 |

- `--radius`: keep `0.75rem` (reference uses 8/12/16/20; shadcn scale derives
  sm/md/lg/2xl from it).
- Graph edge vars (`--edge-dependency`, `--edge-hierarchy`, `--edge-evolution`)
  recolored to reference accent/warn/danger family.
- Add `--font-display` alias = Inter Variable; `--font-mono: "JetBrains Mono"`,
  plus `--font-heading` stays Inter.
- Keep `@custom-variant dark` + base layer. `:root` (not `.dark`) holds the
  palette so the app is dark by default and stays dark.
- Import JetBrains Mono via `@fontsource/jetbrains-mono` (add dependency to
  `packages/ui`); weight 400/500/600.
- Reference also defines success-dim/warn-dim/danger-dim (rgba tints) and
  border-brd colors; implement as Tailwind color-mix utilities or inline rgba
  where used (chips, proposal banner, frozen badges).

### 2. Theme plumbing (`apps/web`)

- `theme-provider.tsx`: pin to dark. Simplest: always apply `dark` class,
  ignore storage; keep `useTheme` API surface to avoid touching consumers.
- `theme-toggle.tsx`: remove from shell (no longer needed). Keep file export
  intact or delete + remove imports.
- `index.html`: add `class="dark"` on `<html>` to prevent flash.

### 3. AppShell (`app-shell.tsx`, `org-switcher.tsx`, `user-menu.tsx`)

Reference layout from workspace-home.html / storyteller-workspace.html:

- Sidebar fixed width 232px (`w-[232px]`, current 240 → 232), `bg-sidebar`,
  right border `--sidebar-border`.
- Top block: brand (logo tile + "Storyteller"), then OrgSwitcher styled as
  reference org-switch — bg tile with initials, org name + role, caret chevron,
  dropdown menu listing orgs + "Create organization" entry (keeps existing
  data flow from `useOrgs`).
- Nav groups (`Workspace` / `Insights` / `Manage`) with uppercase mono labels
  (`nav-items.ts` restructured to include group + icon + optional badge):
  - Workspace: Boards → `/projects`
  - Insights: Graph → board graph (only exists inside project; map to first
    project or omit if no clean target), Library / Lineage / Version history →
    omit (no routes). Keep nav minimal and truthful: Workspace (Boards) +
    Manage (Members, Billing, Analytics).
  - Manage: Members, Billing, Analytics (existing org routes).
- Active state: primary-tinted bg, accent icon, fg text.
- Sidebar footer: user avatar (initials) + name + role, gear → settings link,
  pending-proposal badge when available.
- Mobile: sidebar collapses to drawer behind scrim (existing pattern).
- Topbar (replaces current header):
  - Left breadcrumb: Storyteller / org / board · page label (keep existing
    logic).
  - Global search box with search icon + `Ctrl K` kbd hint (decorative; no
    backend search).
  - Right: notifications icon (decorative dot), theme removal (no toggle),
    EnvIndicator, "New board" button (existing logic), user avatar.
- Keep `LimitBanner` in place.

### 4. Board view (`project-board.tsx`, `kanban.tsx`, `board-column.tsx`, `board-card.tsx`, `closed-rail.tsx`)

- Board header: name (22px/800), sub-line "X active · Y proposed · Z frozen",
  view switch pill (Board / Graph, existing `?view=`).
- AI instruction bar: sparkle label "AI Instruction" + fork-hint chip + input
  - "Run" button. The app's card creation happens via Chat (`project-chat`)
    using `useAiGenerate`. To keep this faithful but honest, the board AI bar's
    "Run" button navigates to `/projects/:slug/chat` (existing generation flow);
    it does NOT introduce a new card-creation path. No "New requirement" button
    on the board header (no such flow exists — don't fabricate one).
- Proposal banner: warn-tinted, count + summary + "Review & approve" →
  `ProposalReview` (exists).
- Columns: reference styling — header with icon + title + count + hint;
  story cards with:
  - REQ-id (from `card.id`/slug), version chip (stable/proposed derived from
    state: proposed status → warn chip, else neutral),
  - title (650 weight), 2-line clamp description (from `description` when
    available, else fall back to criteria count),
  - tag chips (from status/priority where derivable),
  - priority chip (P0/P1/P2 → danger/warn/accent via `priority.ts`),
  - footer: proposer avatar initials + label + relative time (from
    `updatedAt`/`createdAt` when present; omit otherwise).
  - Keep dnd-kit drag/drop wiring intact.
- Frozen rail: dashed border panel below columns, "Frozen" header, grid of
  frozen cards (danger dashed, strikethrough title). Reuse `ClosedRail`
  collapsible logic; restyle to reference.

### 5. Graph (`graph-canvas.tsx`, `graph-node.tsx`, `graph-edge.tsx`, `graph-view.tsx`)

- Canvas: dotted-grid background (radial-gradient 1px dots @26px), bordered,
  rounded panel.
- Nodes: reference style — bg fill + border, state dot top-right by status
  (active=accent, proposed=warn, frozen=danger), frozen = dashed danger + lower
  opacity. Keep impact highlight + dim logic and dagre/ReactFlow wiring.
- Edges: dependency=accent, hierarchy=neutral, evolution=glow/primary; frozen
  edge dashes where applicable. Keep existing per-type CSS-var drive.
- Toolbar + impact banner: recolor; keep behavior.

### 6. Card drawer + diff (`card-drawer.tsx`, `diff-panel.tsx`)

- Drawer: reference anatomy — head (id meta, title, optional lineage pill),
  body blocks with uppercase mono section labels, footer audit row (approver
  avatar + name + time) + Approve/Reject for proposed cards. Tabs
  (Details/History/Relations/Similar) kept.
- Diff: reference rows — add = success tint w/ `+` gutter, del = danger tint
  w/ `-` gutter, strikethrough del text.
- Closed banner + comments sections: recolor, keep behavior.

### 7. Landing (`routes/landing.tsx`)

Rebuild from landing.html using existing stack (Link, Button, lucide-react,
shadcn Card):

- Sticky nav: brand, links (Features/Live demo/How it works/Docs→omit), Sign in
  - Get started.
- Hero: pill badge, gradient headline, sub, CTA, prompt→board simulator card
  (animated staggered cards: DRAFT/PROPOSED/APPROVED with REQ ids).
- Features: 4-card grid with icon tiles + accent colors + mono kicker lines.
- Sandbox demo: textarea → generates proposal cards client-side.
- Steps: 4-step workflow with numbered mono headers + top accent lines.
- CTA band + footer.

### 8. Auth (`auth-shell.tsx` + auth routes)

- AuthShell restyled to auth.html: radial bgfx glow, brand topbar + "Back to
  site", centered 400px card, mono uppercase labels, banner variants
  (info/warn/success), full-width primary buttons. Keep RHF + Zod forms + auth
  logic. Login/signup/forgot/reset/verify pages recolor + align labels.

### 9. Secondary pages (recolor + polish only)

onboarding, billing, analytics, org-members, project-chat: inherit palette via
tokens. Fix any hardcoded light-mode Tailwind colors that clash (e.g.
`bg-white`, `text-black`, `border-zinc-*`, `shadow-sm` remain fine on dark via
tokens, but audit for raw whites). No structural changes.

### 10. Priority chips (`lib/priority.ts`)

Map to reference P0/P1/P2 semantics:

- P0 → danger (destructive tint + border)
- P1 → warn tint
- P2 → accent tint
- low/none → muted
  Keys stay the app's priority values (critical/high/medium/low); map
  critical→P0, high→P1, medium→P2, low→none.

## Files touched

- `packages/ui/src/styles/globals.css` — tokens + fonts
- `packages/ui/package.json` — add `@fontsource/jetbrains-mono`
- `apps/web/index.html` — `class="dark"`
- `apps/web/src/providers/app-provider.tsx` — keep ThemeProvider (pinned dark)
- `apps/web/src/components/theme-provider.tsx` — pin dark
- `apps/web/src/components/theme-toggle.tsx` — remove
- `apps/web/src/components/app-shell.tsx` — rebuild
- `apps/web/src/components/org-switcher.tsx` — restyle
- `apps/web/src/components/user-menu.tsx` — restyle
- `apps/web/src/lib/nav-items.ts` — group + icon + optional badge
- `apps/web/src/components/kanban.tsx`, `board-column.tsx`, `board-card.tsx`,
  `closed-rail.tsx` — restyle to reference
- `apps/web/src/components/card-drawer.tsx`, `diff-panel.tsx` — restyle
- `apps/web/src/components/graph-canvas.tsx`, `graph-node.tsx`,
  `graph-edge.tsx` — restyle
- `apps/web/src/lib/priority.ts` — P0/P1/P2 mapping
- `apps/web/src/routes/project-board.tsx` — board header + AI bar (navigates
  to chat) + banner
- `apps/web/src/routes/landing.tsx` — rebuild
- `apps/web/src/components/auth-shell.tsx` + auth routes (login, signup,
  forgot-password, reset-password, verify-email) — restyle

## Out of scope

- New routes/pages from the reference not present in the app (library,
  lineage, version history, org settings, member directory, docs, changelog,
  api reference).
- Backend / data-contract changes; new-card creation flow internals; chat
  functionality; global search backend.
- Light theme.

## Risks / notes

- Token remap changes every page's look simultaneously; verify contrast
  (bg `#0b1020` + fg `#f8fafc` passes AA). `--muted` reused as both bg and a
  text-ish surface — keep `--muted` dark (surface-warm) and `--muted-foreground`
  (muted blue-grey) distinct.
- e2e tests may assert on visuals/labels; run `bun run test` + typecheck.
- Existing tests reference `theme-toggle`? Search before removing.
- `@fontsource/jetbrains-mono` pinned exact version per repo `.npmrc`.
