# 01-06 Plan Summary — Frontend Core (Hooks, Shell, Landing, Dashboard, Chat)

Status: **Complete**

## Tasks Executed

### Task 1 — Data layer (hooks + store)

- `hooks/use-orgs.ts`: `useOrgs`, `useCreateOrg`, `useInviteMember`, `useAcceptInvite`, `useOrgMembers`, `useChangeMemberRole`, `useRemoveMember` — TanStack Query, keys `["orgs"]`, `["orgs", orgId, "members"]`
- `hooks/use-projects.ts`: `useProjects(orgId)` → `["projects", orgId]`, `useProject(slug)`, `useCreateProject`
- `hooks/use-ai.ts`: `useAiGenerate`, `useAiProcess`, `useAiClarify` — invalidate `["proposals", projectSlug]` on success
- `hooks/use-proposals.ts`: `useProposals(projectId)`, `useProposal`, `useApproveProposal`, `useRejectProposal`
- `stores/board-store.ts`: `useBoardStore` (zustand) — selectedOrgId, columns, closedRailCollapsed, activeCardId, promptHistory + setters (UI state only)
- All queryFns unwrap the `{ success, data }` envelope → components get clean arrays/objects

### Task 2 — Shell + pages + routing

- `components/app-shell.tsx`: collapsible sidebar (desktop), org switcher, nav (Boards, Members), topbar with "New board" + role badge + user menu, renders `<Outlet />`
- `components/org-switcher.tsx`: dropdown of `useOrgs()` results, selects org → navigates to /projects
- `components/user-menu.tsx`: name + role badge (owner/admin/member/viewer) + sign out
- `routes/landing.tsx`: public page at `/` — hero ("Turn a product idea into a living requirements board"), how-it-works (3 steps), features grid (living cards, approvals, version history, semantic memory), static example kanban mock, CTA, footer. Dark-aware, responsive.
- `routes/projects.tsx`: project card grid (name, description, card count, last activity), empty state, "New board" RHF form → create → navigate to board
- `routes/org-members.tsx`: members table (name, email, role), invite form (email + role select), role-change select per row (owner locked)
- `App.tsx`: `/` → LandingPage (public, outside PublicRoute); inside ProtectedRoute+AppShell: `/dashboard`, `/projects`, `/projects/:slug/chat`, `/orgs/:orgId/members`

### Task 3 — Chat/generate panel + component tests

- `routes/project-chat.tsx`: message thread (user prompts + AI responses with clarifying/board/error kinds), textarea `data-testid="prompt-input"`, generate → clarifying questions rendered inline with `data-testid="clarify-answer"` inputs → submit via useAiClarify (threading prior Q&A), pending proposal list from useProposals with status chips
- `components/__tests__/app-shell.test.tsx`: mocks use-auth + use-orgs; asserts brand, org switcher, role badge, sign-out render; org selection on click (fireEvent)

## Verification Results

| Check                                                               | Result                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `bun --filter web typecheck`                                        | ✅ pass                                                    |
| `bun --filter web lint`                                             | ✅ pass                                                    |
| `bun run test` (root vitest, jsdom)                                 | ✅ 191 tests / 37 files pass (incl. 3 new component tests) |
| grep `OPENAI_API_KEY`/`ANTHROPIC_API_KEY`/`AI_PROVIDER` in apps/web | ✅ 0                                                       |

## Notes / Deviations

- **Test invocation**: web tests MUST run via `bun run test` from the root (root `vitest.config.ts` sets `environment: jsdom` + setup). Running `bun --filter web test` from the workspace bypasses the root config (no jsdom) and fails. Documented for the E2E phase.
- **Web build (`bun run build`)**: pre-existing template issue — `tsc -b` in the web build compiles `src/**` including `__tests__` files that use `toBeInTheDocument`/vitest globals without the jest-dom types configured, so `bun --filter web build` fails on pre-existing template test files (verify-email.test.tsx, etc.). Attempted fix (excluding `__tests__` from tsconfig.app.json) broke vitest (`React is not defined` — vitest derives the JSX transform from the same tsconfig), so it was reverted. This is orthogonal to plan 01-06 and tracked as a template issue.
- API responses typed inline with the `{ success, data }` envelope unwrapped in queryFns.

## Commit History (this plan)

- feat(web): add frontend core — hooks, app shell, landing, dashboard, org members, chat
