# Storyteller — Living Requirements Board for Business Folks

**Status:** Approved design — ready for implementation planning
**Date:** 2026-08-02
**Author:** Product team + AI-assisted design
**Approach:** Approach A — Living Requirement Board, built in phases

---

## 1. Product Overview

**Storyteller** is a SaaS product that turns a product idea written in plain English into a **living requirements board**. Business folks describe an idea ("build a loyalty program with points and rewards"), and AI:

1. Generates an initial board of story/requirement cards (epics, features, stories).
2. Keeps open cards **in sync** as new requirements/instructions/decisions arrive.
3. **Freezes closed cards** — new changes targeting them spawn replacement cards instead of mutating them.
4. Maintains a full **version history + diff** for every card.
5. Flags **contradictions/duplicates** between new suggestions and closed cards.
6. Supports **semantic recall** of all past cards (open and closed) via embeddings.

The product is a **multi-tenant SaaS** with organizations, members, roles, and project access control. Built for business/PM folks who need to hand clean, consistent, non-contradictory requirements to engineering.

### Core value proposition

> Turn a product idea into a living requirements board — AI generates, reviews, and keeps your stories in sync. Closed cards freeze; nothing is lost; everything is auditable.

---

## 2. Core Concepts & Semantics

### 2.1 The card lifecycle

- **Card** — a story/requirement. Open or closed.
- **Open card** — can be updated in place by AI proposals (after user approval) or by user edits.
- **Closed card** — frozen snapshot. Immutable. Any AI change that would target it instead **creates a new card** linked by an `evolved-from` relation. Closed cards can be closed manually by the user or auto-closed by AI when requirements are satisfied.
- **Versioning** — every change to a card creates a new immutable `card_version` — whether the change came from an approved AI proposal **or** a manual user edit. History is always available; diffs are viewable side-by-side.

### 2.2 The approval model

- AI **never writes directly** to the database. It produces **proposals** — a batch of changes (create/update/close).
- Proposals sit in an **approval queue**. A user must **approve** or **reject** the proposal as a whole (batch-level, all-or-nothing).
- Approval is tracked per change: `approver_id`, `approved_at`/`rejected_at`, optional rejection reason.
- All actions carry timestamps (`created_at`, `updated_at`); versions record `created_by` and `created_at`.
- **All AI-created new cards require explicit user approval** before they become live. Manual user-created cards are live immediately (the user is the authority for their own manual edits).

### 2.3 The graph model

Three edge types, all color-coded in the graph view:

| Edge type    | Meaning                                  | Visual        |
| ------------ | ---------------------------------------- | ------------- |
| `dependency` | Card blocks / is blocked by another card | Orange        |
| `hierarchy`  | Parent (epic/feature) → child (story)    | Blue          |
| `evolution`  | Closed card → its replacement card(s)    | Purple dashed |

### 2.4 Semantic memory

- Every card (open **and** closed) has an **embedding** of its title + description + acceptance criteria + priority + tags.
- During new-card creation, AI runs a **semantic search** ("find the N most relevant existing cards") and injects them into the prompt context — including closed cards, so AI knows whether to evolve vs. duplicate.
- Embeddings live in **pgvector** (PostgreSQL extension) — no separate vector DB infrastructure.

---

## 3. User Personas & Access Model

### 3.1 Roles

| Role       | Permissions                                                        |
| ---------- | ------------------------------------------------------------------ |
| **Owner**  | Everything: manage org, members, all projects, billing, delete org |
| **Admin**  | Manage members + all projects, approve proposals                   |
| **Member** | Work on projects, approve/reject proposals                         |
| **Viewer** | Read-only (view board/graph/cards, no edits/approvals)             |

### 3.2 Organization model

- Every user gets a **personal org** on signup (their sandbox).
- Users can create additional orgs and **invite members by email** (invite → Better Auth email → join link → role assignment).
- A `project` belongs to one `organization`. **Org-wide access**: any org member can access any org project, gated by role. No per-project member lists in v1.
- **Multi-tenancy safeguard**: all queries scoped by `organization_id`; middleware enforces membership; cross-org isolation tests verify User A cannot read User B's data.

---

## 4. Data Model (new tables in `packages/schemas/src/db/`)

All tables carry `created_at` and `updated_at` timestamps (Drizzle defaults).

| Table                 | Purpose & key fields                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organization`        | id, name, slug, created_by, timestamps                                                                                                                                                                                                                  |
| `organization_member` | org_id, user_id, role (owner/admin/member/viewer), timestamps                                                                                                                                                                                           |
| `project`             | id, org_id, name, slug, description, columns (JSON config), status, timestamps                                                                                                                                                                          |
| `epic`                | id, project_id, name, description, parent_epic_id?, order, timestamps                                                                                                                                                                                   |
| `card`                | id, project_id, epic_id?, title, description (markdown), acceptance_criteria (JSON array of strings), status, priority, assignee_id?, custom_fields (JSON), is_closed, closed_by?, closed_at?, unique slug, timestamps                                  |
| `card_version`        | id, card_id, version_no, title, description, acceptance_criteria (JSON snapshot), status, priority, custom_fields (JSON snapshot), created_by, created_at, change_type (create/update/close), source_proposal_change_id?                                |
| `card_relation`       | id, project_id, source_card_id, target_card_id, type (dependency/hierarchy/evolution), timestamps                                                                                                                                                       |
| `card_attachment`     | id, card_id, file_id (→ existing `file` table), uploaded_by, created_at                                                                                                                                                                                 |
| `custom_field`        | id, project_id, name, type (text/dropdown/date), config (JSON: options for dropdown), required, order, timestamps                                                                                                                                       |
| `proposal`            | id, project_id, created_by, instruction (the user's natural-language input), prompt (full AI prompt), ai_response (raw), status (pending/approved/rejected), created_at, updated_at                                                                     |
| `proposal_change`     | id, proposal_id, change_type (create/update/close), target_card_id?, new_data (JSON: title/desc/status/priority/custom fields), relation_summary (JSON), conflict_flags (JSON), approver_id?, approved_at?, rejected_at?, rejection_reason?, created_at |
| `comment`             | id, card_id, user_id, body (markdown), parent_id? (threading), mentions (JSON array of user_ids), created_at, updated_at                                                                                                                                |
| `card_embedding`      | id, card_id, version_id?, embedding (vector), model, created_at                                                                                                                                                                                         |

**Card closed semantics:** `is_closed = true` + `closed_at`/`closed_by`. Closed cards are never `update` targets in proposals; the AI engine emits `create` replacement cards with an `evolution` relation edge instead.

---

## 5. AI Engine

### 5.1 Package: `@workspace/ai`

- `LLMProvider` interface: `chat()` and `embed()`. Implementations: `openai` (default), `anthropic` (stub ready), `mock` (deterministic, for tests/dev without keys).
- **Prompt builders**: generate-board, process-instruction, clarifying-questions, consistency-review.
- **Zod validation** of all AI JSON output — malformed output is rejected with a friendly error, never silently accepted.

### 5.2 AI operations

1. **Generate board from prompt** — returns structured JSON: epics + story cards (title, description, acceptance criteria, priority, suggested column). Each becomes an open, unapproved card behind a proposal.
2. **Clarifying questions** — when a prompt/instruction is ambiguous, AI may respond with clarifying questions _instead of_ generating cards. The Q&A exchange is stored on the project for full context.
3. **Process new instruction** — given full board context (all cards + statuses + semantic matches), returns a proposal batch: `create` / `update` (open cards only) / `close`. Each change carries a **relation/diff summary** (how it relates to other cards, how it differs from or contradicts closed cards) shown to the user at approval time.
4. **Consistency review** — AI flags contradictions/duplicates/conflicts across cards, surfaced as badges.

### 5.3 Instruction context

When processing "add gift cards", AI receives:

- Full board snapshot (all open + closed cards, statuses, relations, epics) — compacted.
- **Semantic matches** from pgvector: the N most relevant existing cards, with open/closed flags.

This is what prevents AI from re-creating something already accepted.

### 5.4 Embeddings (`@workspace/vector` package)

- `embedCard()`, `semanticSearch()`, `reindexCard()` helpers on top of `@workspace/db`.
- Embeddings recomputed when a card version is approved. Closed-card embeddings persist forever.

---

## 6. API Surface (`apps/api/src`)

Auth routes already exist. New routes (all org-scoped, all authenticated unless noted):

| Route                                 | Purpose                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `POST /api/orgs`                      | Create org                                                   |
| `GET /api/orgs`                       | List my orgs                                                 |
| `POST /api/orgs/:id/invite`           | Invite member by email                                       |
| `GET /api/orgs/:id/members`           | List members                                                 |
| `PATCH /api/orgs/:id/members/:userId` | Change role / remove member                                  |
| `POST /api/projects`                  | Create project                                               |
| `GET /api/projects`                   | List projects (my org)                                       |
| `GET /api/projects/:slug`             | Project detail (board columns, cards)                        |
| `GET /api/projects/:slug/graph`       | Graph nodes + edges                                          |
| `POST /api/ai/generate`               | Generate initial board from prompt (or clarifying questions) |
| `POST /api/ai/process`                | Process a new instruction → proposal                         |
| `POST /api/ai/clarify`                | Answer clarifying questions → continue generation            |
| `GET /api/proposals?project=`         | List proposals (approval queue)                              |
| `GET /api/proposals/:id`              | Proposal detail with diffs/relations/conflicts               |
| `POST /api/proposals/:id/approve`     | Approve (records approver + time)                            |
| `POST /api/proposals/:id/reject`      | Reject (records reason)                                      |
| `POST /api/cards`                     | Manual card creation                                         |
| `PATCH /api/cards/:id`                | Manual card update (user edits apply directly)               |
| `POST /api/cards/:id/close`           | Manual close                                                 |
| `GET /api/cards/:id`                  | Card detail (with versions)                                  |
| `GET /api/cards/:id/versions`         | Version history                                              |
| `GET /api/cards/:id/similar`          | Semantically similar cards                                   |
| `POST /api/cards/:id/comments`        | Add comment / reply                                          |
| `GET /api/cards/:id/comments`         | List comments                                                |
| `POST /api/upload`                    | Existing file upload (for attachments)                       |

### API security

- Zod-validated inputs everywhere.
- Org-scoping middleware: authenticated → session → org membership → role.
- Rate limiting on AI + auth endpoints.

---

## 7. Frontend (`apps/web`)

### 7.1 Landing page (public, `/`)

Built with component ideas from **21st.dev** (hero, feature grid, how-it-works, pricing preview, CTA, footer), adapted to shadcn/ui + Tailwind v4. Dark-mode aware via existing ThemeProvider.

### 7.2 App shell (authenticated)

- **Left sidebar** (collapsible → slide-over on mobile): org switcher, nav (Boards, Graph, Chat, Members, Settings), user menu with role badge.
- **Topbar**: breadcrumbs/project name, search, "New board" button, notifications bell (Phase 3), avatar menu.
- **Responsive**: sidebar collapses on mobile; board/graph get mobile-friendly stacks; tables scroll horizontally.

### 7.3 Views

1. **Chat / Generate panel** — natural-language input; clarifying Q&A; streams AI progress; each message → proposal for review.
2. **Board view (kanban)** — configurable columns (default Backlog, To Do, In Progress, Review, Done) + special **Closed** rail (read-only, visually distinct). Cards show priority, assignee, criteria count, conflict badges, relation indicators. Drag-and-drop for manual user moves (applies directly, no approval); AI suggestions go through approval.
3. **Graph view** — interactive node graph (react-flow-style lib) with the three edge types color-coded; click node → card drawer; filter toggles; "impact of X" highlight.
4. **Card detail drawer** — markdown body, acceptance criteria, custom fields, attachments, comments/mentions, **version history + side-by-side diff**, **relations tab**, **similar cards**, copy unique link.
5. **Project list dashboard** — card grid with progress, last-updated, member avatars.
6. **Org members/settings** — invite, roles, members table.

---

## 8. Phased Build Plan

Each phase ends with: tests passing (unit + API + component + **E2E**), typecheck clean, lint clean, working demo.

### Phase 1 — Core loop (the MVP differentiator)

- `@workspace/ai` package: provider abstraction (openai + mock), generate-board, clarifying questions, process-instruction, consistency review
- `@workspace/vector` package: pgvector embeddings + semantic search
- Full data model: orgs, members, projects, epics, cards, card_versions, relations, custom fields, proposals, proposal_changes, comments, card_embeddings
- API: org-scoped CRUD + AI endpoints + approval flow with approver/time tracking
- Frontend: landing page (21st.dev), app shell, project list, chat/generate panel, kanban board, card drawer (versions, diff, relations, similar)
- Auth: personal org on signup, invites by email, roles
- **E2E (Phase 1 journeys):** signup → personal org auto-created → create project → prompt → mock provider generates cards → proposal appears → approve → cards on board → card detail + version history → close card → new instruction creates replacement (not update) → cross-user isolation

### Phase 2 — Graph & collaboration depth

- Graph view (dependencies, hierarchy, evolution) with react-flow
- Comments/mentions polish, real-time updates (SSE), notifications
- AI status/priority suggestions, auto acceptance-criteria display, export (CSV/JSON/Markdown)
- **E2E:** graph renders edges, comments/mention flow, export produces files

### Phase 3 — SaaS hardening

- Stripe billing (designed for already), usage limits per plan
- Onboarding, analytics, audit admin, deployment polish (Terraform exists in template)
- **E2E:** billing page, plan-limit enforcement

---

## 9. Testing Strategy

| Layer                                                               | Tool                     | Where                     |
| ------------------------------------------------------------------- | ------------------------ | ------------------------- |
| Unit (schemas, AI JSON validation, prompt builders, vector helpers) | Vitest                   | `packages/*` `__tests__/` |
| API (org scoping, approval flow, isolation)                         | `bun test`               | `apps/api/src/__tests__/` |
| Component (board card, diff panel, drawer)                          | Vitest + Testing Library | `apps/web`                |
| **E2E (Playwright)**                                                | Playwright in `apps/e2e` | user journeys, per phase  |

- **E2E uses the mock AI provider** — deterministic, no live API calls, no cost, no flakiness.
- Existing `apps/e2e` infra (seed + dedicated test DB) is extended per phase.

---

## 10. Industry-Standard SDLC

- **Branching:** `main` (production) + `develop` (integration) + feature branches. PR → CI passes → review → merge to `develop`; promote to `main` via release PR.
- **CI gates** (extend existing `ci.yml`): lint, typecheck, build, unit/integration tests, **E2E**, coverage thresholds, commitlint on commits, dependency audit, secret scanning (gitleaks), format check.
- **Coverage:** ~80% core logic, ~70% API, enforced in CI.
- **Hooks:** husky + lint-staged (existing) — format/lint/typecheck staged files.
- **Environments:** Dev (local Docker Compose, mock AI) → Staging (from `develop`, real AI, seeded demo, E2E/UAT) → Production (from `main`, gated, migrations as deploy step, health checks).
- **Deployment:** containerized (Dockerfiles exist); migrations run as a separate step before new traffic; zero-downtime rollout via Terraform EKS/ALB scaffolding.
- **Observability:** Winston structured logs (exists) + request IDs; health endpoint (exists); error tracking + uptime in Phase 3.
- **Versioning:** semantic versioning; CHANGELOG from Conventional Commits; tagged releases.
- **Security:** Zod-validated env/inputs (exists), org-scoping + isolation tests, rate limiting, no secrets in code, audit trail on all approvals.

---

## 11. Environment Variables (new)

```
# AI provider (default openai; "mock" for dev/test)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...        # optional, when AI_PROVIDER=anthropic
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini          # or provider-specific
```

These are added to `apps/api/src/env.ts` Zod schema with defaults so dev runs fine without keys (mock provider).

---

## 12. Key Decisions Summary

| Decision                                                       | Rationale                                          |
| -------------------------------------------------------------- | -------------------------------------------------- |
| Approach A — living board, phased                              | Full vision with reviewable, valuable increments   |
| Cards versioned + closed cards spawn replacements              | The core trust model; immutable history            |
| All AI changes go through approval, tracked w/ approver + time | Auditability; business-safe                        |
| Clarifying questions before generation                         | Reduces wasted generation on ambiguous input       |
| pgvector embeddings in PostgreSQL                              | No new infra; semantic recall of closed cards      |
| Provider-agnostic AI (OpenAI default)                          | No lock-in; mock provider for deterministic tests  |
| Kanban + special Closed rail                                   | Familiar to business folks; clean freeze semantics |
| Org roles Owner/Admin/Member/Viewer                            | Standard, flexible access control                  |
| Billing deferred, designed for                                 | Ship/validate first; slot in Stripe without rework |
| Industry-standard SDLC gates in every phase                    | Quality bar + safe releases                        |
| E2E in every phase with mock AI                                | Regression safety without cost/flakiness           |
