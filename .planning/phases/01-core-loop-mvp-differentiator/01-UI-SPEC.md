# Phase 1: Core Loop — UI Design Contract

**Phase:** 1-core-loop-mvp-differentiator
**Date:** 2026-08-02
**Source:** Approved design spec §7 (Frontend) + §8 (SaaS Dashboard)

## Design System

- shadcn/ui components from `packages/ui/` — never build from scratch before checking shadcn.
- Tailwind CSS v4 utility classes. Dark mode via existing ThemeProvider.
- No custom design system; consistent tokens via existing setup.
- Responsive: sidebar collapses to slide-over on mobile; board/graph get mobile-friendly stacks; tables scroll horizontally.

## Layout: App Shell (authenticated)

- **Left sidebar** (collapsible → slide-over on mobile): org switcher at top, nav (Boards, Chat, Members, Settings), user menu at bottom with role badge.
- **Topbar**: breadcrumbs/project name, search, "New board" button, avatar menu.
- Consistent across all authenticated views.

## Views

### 1. Landing page (public, `/`)

- 21st.dev-inspired sections adapted to shadcn/ui: hero, how-it-works (3 steps), features grid, example board preview, CTA, footer.
- Value prop copy: "Turn a product idea into a living requirements board — AI generates, reviews, and keeps your stories in sync."
- Dark-mode aware, responsive.

### 2. Project list dashboard

- Grid of project cards: name, progress, last-updated, member avatars, "New board" button.

### 3. Chat / Generate panel

- Natural-language input box; clarifying Q&A threaded display; AI progress states (generating, reviewing).
- Each message → proposal for review (link to review queue).

### 4. Kanban board

- Configurable columns (default: Backlog, To Do, In Progress, Review, Done) + special **Closed** rail (read-only, visually distinct).
- Card shows: title, priority badge, assignee avatar, acceptance-criteria count, conflict/alert badges, relation indicators (e.g., "depends on ⬆ 2").
- Drag-and-drop for manual moves (applies directly). AI changes go through approval.
- Pending proposals appear as a review queue; clicking shows diff panel.

### 5. Card detail drawer

- Markdown body, acceptance criteria, custom fields (dropdown/date/text pills), attachments, comments.
- Tabs: Details | History (version list + side-by-side diff vs current) | Relations | Similar cards.
- Copy unique link button (`/project/:slug/card/:cardSlug`).

### 6. Org members/settings

- Invite by email, role assignment, members table, role badges.

## Interaction & Feedback

- Empty states with clear CTAs (no project yet, no cards yet).
- Loading skeletons for queries; error states with retry.
- Approval success/failure toasts.
- Form validation errors from React Hook Form + Zod.

## E2E Visual Anchors

- Test ids/data attributes on key interactive elements (prompt input, approve button, close button, nav items) to keep Playwright journeys stable.
