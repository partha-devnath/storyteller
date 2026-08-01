# Phase 1: Core Loop (MVP Differentiator) — Context

**Gathered:** 2026-08-02
**Status:** Ready for planning
**Source:** Approved design spec (`docs/superpowers/specs/2026-08-02-storyteller-design.md`)

<domain>
## Phase Boundary

Ship the core loop of the Living Requirements Board:

- User signs up, gets a personal org, creates a project.
- User types a product prompt; AI generates an initial board of epic/story cards (behind a proposal).
- AI may ask clarifying questions instead of generating when input is ambiguous.
- User approves/rejects proposals (batch-level, tracked with approver + timestamps).
- Approved cards appear on a kanban board; cards version on every change.
- Closing a card freezes it; later instructions targeting it create a replacement card (evolution edge).
- pgvector semantic memory recalls relevant open + closed cards during generation.
- Professional responsive SaaS dashboard shell + landing page (21st.dev-inspired).
- E2E Playwright journeys with mock AI provider.

This phase does NOT include: graph view (Phase 2), export/notifications/SSE (Phase 2), billing (Phase 3).
</domain>

<decisions>
## Implementation Decisions

### AI Engine

- `@workspace/ai` package with `LLMProvider` interface: `chat()` and `embed()`. Providers: `openai` (default), `anthropic` (stub), `mock` (deterministic for tests/dev).
- AI operations: generate-board, clarifying-questions, process-instruction, consistency-review.
- AI JSON output validated against strict Zod schemas; malformed output rejected with a friendly error.
- AI NEVER writes to DB — only produces proposals stored in `proposal` + `proposal_change` tables.
- Full prompt + AI response stored per proposal for auditability.
- Instruction context = full board snapshot + semantic matches from pgvector.

### Data Model

- New tables in `packages/schemas/src/db/`: organization, organization_member, project, epic, card, card_version, card_relation, card_attachment, custom_field, proposal, proposal_change, comment, card_embedding.
- All tables carry `created_at`/`updated_at`. Versions record `created_by` + `created_at`. Proposal changes record `approver_id`, `approved_at`/`rejected_at`, `rejection_reason`.
- Card fields: title, markdown description, acceptance_criteria (JSON array), status, priority, assignee_id, custom_fields (JSON), is_closed, closed_by, closed_at, unique slug.
- `is_closed = true` cards are immutable; AI emits `create` replacement cards with an `evolution` relation edge instead of updates.
- Proposals approved/rejected at batch level; tracked per change.

### Semantic Memory

- `@workspace/vector` package: pgvector embeddings via `embedCard()`, `semanticSearch()`, `reindexCard()`.
- Embeddings of title + description + acceptance criteria + priority + tags. Recompute on version approval; closed-card embeddings persist.
- Card detail shows semantically similar cards.

### Organizations & Auth

- Personal org auto-created on signup. Users can create orgs and invite members by email (Better Auth email → join link → role).
- Roles: owner, admin, member, viewer. Org-wide access (no per-project member lists in v1).
- Org-scoping middleware: authenticated → session → org membership → role → 403 otherwise.

### API

- Hono routes: /api/orgs, /api/projects, /api/ai/generate|process|clarify, /api/proposals (list/detail/approve/reject), /api/cards (CRUD + close + versions + similar + comments), /api/upload (existing).
- Zod-validated inputs; rate limiting on AI + auth endpoints.

### Frontend

- Landing page at `/` (21st.dev-inspired components adapted to shadcn/ui + Tailwind v4).
- Responsive app shell: collapsible sidebar (org switcher, nav, user menu w/ role badge), topbar, mobile-friendly.
- Views: project list dashboard, chat/generate panel, kanban board (configurable columns + Closed rail), card detail drawer (markdown, criteria, custom fields, attachments, comments, version history + diff, relations, similar, copy link).
- Manual user edits/drag-drop apply directly; AI changes go through approval.
- TanStack Query for data fetching; React Hook Form + Zod for forms; Zustand for client state.

### Testing

- Unit (Vitest) in packages; API tests (`bun test`); component tests (Vitest + Testing Library); E2E (Playwright in apps/e2e) with mock AI provider.
- Cross-org isolation tests: User A cannot read User B's data.
- Coverage: ~80% core logic, ~70% API.

### E2E

- Extend existing apps/e2e infra (seed + dedicated test DB). Journeys: signup → personal org → create project → prompt → mock AI generates cards → proposal → approve → board → card detail/versions → close → replacement card → cross-user isolation.
  </decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Spec (source of truth)

- `docs/superpowers/specs/2026-08-02-storyteller-design.md` — full approved product design (data model, AI engine, API surface, frontend, phasing, testing, SDLC, env vars)

### Project conventions

- `AGENTS.md` — monorepo conventions (Bun runtime, Hono factory, Drizzle ORM, shadcn/ui, no default exports, erasableSyntaxOnly, Vitest/bun test, Conventional Commits)

### Existing template patterns

- `packages/schemas/src/db/` — Drizzle table definitions (source of truth; re-export from index.ts)
- `packages/schemas/src/validations/` — Zod schemas
- `apps/api/src/app.ts` — Hono app wiring; `apps/api/src/env.ts` — Zod env validation
- `apps/api/src/middleware/` — error handler
- `apps/web/src/` — routes, components (ProtectedRoute), hooks (use-auth), providers, lib (api-client), stores
- `packages/auth/` — Better Auth server instance
- `apps/e2e/src/` — Playwright seed + global setup/teardown + smoke test

### Migration workflow

- Drizzle migrations: `bun --filter @workspace/db generate` then `bun --filter @workspace/db migrate` (see AGENTS.md)
  </canonical_refs>

<specifics>
## Specific Ideas

- Card unique deep-link URL format: `/project/:slug/card/:cardSlug`.
- Closed rail is read-only and visually distinct on the board.
- Pending proposals appear as a review queue; approving applies version bumps + recomputes embeddings.
- Landing page sections: hero, how-it-works (3 steps), features, example board preview, CTA, footer.
  </specifics>

<deferred>
## Deferred Ideas

- Graph view (dependencies/hierarchy/evolution) — Phase 2.
- Export (CSV/JSON/Markdown), SSE real-time, notifications — Phase 2.
- Stripe billing, usage limits, onboarding, analytics — Phase 3.
- OAuth/SSO, per-project member lists, RLS — out of scope for v2.0.
  </deferred>

---

_Phase: 1-core-loop-mvp-differentiator_
_Context gathered: 2026-08-02 via approved design spec_
