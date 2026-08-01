# storyteller

## What This Is

A multi-tenant **SaaS product** that turns a product idea written in plain English into a **living requirements board**. Business folks type a product idea, AI generates story/requirement cards, and the board keeps evolving as new requirements arrive. Open cards update in place (after approval); closed cards freeze and spawn replacement cards; everything is versioned, diffable, and auditable. Built on the storyteller full-stack monorepo template (Bun, Vite, React 19, Hono, Better Auth, Drizzle ORM, PostgreSQL).

## Current Milestone: v2.0 Living Requirements Board

**Goal:** Turn a product idea into a living requirements board — AI generates story cards, keeps open cards in sync, freezes closed cards (spawning replacements), with approvals, version history, semantic memory, multi-tenant orgs, and professional SaaS UI.

**Target features:**

- AI engine + approval flow (generate board, clarifying questions, process instructions, consistency review)
- Kanban board + card detail drawer (version history, diff, relations, similar cards)
- Graph view (dependencies, hierarchy, evolution lineage)
- Organizations, members, roles, invites
- Landing page + professional SaaS dashboard (21st.dev-inspired)
- E2E tests in every phase (mock AI provider)

## Core Value

Business folks can describe an idea in natural language and get a clean, consistent, non-contradictory requirements board that AI keeps in sync — closed cards freeze, nothing is lost, every change is approved and auditable.

## Requirements

### Validated

- ✓ User can sign up with email/password — existing
- ✓ Email verification flow is wired — existing
- ✓ User can sign in and reset password — existing
- ✓ Protected dashboard route is available — existing
- ✓ Database migrations run via Drizzle Kit — existing
- ✓ Emails are captured in Mailpit in development — existing
- ✓ S3-compatible file uploads via floci S3 / AWS S3 adapter — existing

### Active

- [ ] Personal org auto-created on signup; users can create orgs and invite members by email
- [ ] AI generates an initial board of story cards from a natural-language prompt
- [ ] AI asks clarifying questions when a prompt/instruction is ambiguous
- [ ] AI processes new instructions into approval proposals (create/update/close)
- [ ] All AI-created cards require explicit user approval, tracked with approver + timestamp
- [ ] Closed cards are frozen; new changes spawn replacement cards (evolution lineage)
- [ ] Card version history + side-by-side diff
- [ ] pgvector semantic memory — AI recalls relevant open + closed cards during generation
- [ ] Kanban board view with configurable columns + special Closed rail
- [ ] Graph view: dependencies, hierarchy, evolution lineage
- [ ] Card detail drawer: markdown, acceptance criteria, custom fields, comments, relations, similar cards
- [ ] Professional SaaS landing page + responsive dashboard shell (21st.dev-inspired)
- [ ] E2E Playwright journeys in every phase (mock AI provider)

### Out of Scope

- Billing/subscription logic — deferred to Phase 3 (designed for; Stripe slot-in)
- Production-grade SSO/OAuth providers — defer to product-specific integration
- Real-time websocket collaboration — SSE/polling in Phase 2, websockets later
- Mobile native app — web-first, responsive
- Per-project member lists — org-wide access in v1
- Row-level security in Postgres — disciplined query scoping + isolation tests in v1

## Context

- Monorepo uses Bun workspaces and Turborepo for task orchestration.
- Internal packages are scoped to `@workspace/*` and are never published.
- Auth is handled by Better Auth with Drizzle adapter and PostgreSQL backing.
- File storage is abstracted behind `@workspace/files` with S3-compatible adapter.
- Docker Compose includes PostgreSQL 16 Alpine, Mailpit, and application services.
- Terraform is provided for AWS ECR, EKS, and application gateway (ALB) provisioning.

## Constraints

- **Runtime**: Bun — Node-specific packages may need compatibility checks.
- **Database**: PostgreSQL 16+ — older versions not tested.
- **TypeScript**: `erasableSyntaxOnly` enabled — no enums, namespaces, or non-erasable syntax.
- **Auth**: Better Auth secret must be at least 32 characters.
- **Deployment**: Terraform AWS provider ~> 5.0; EKS Kubernetes 1.30.

## Key Decisions

| Decision                                                | Rationale                                                      | Outcome   |
| ------------------------------------------------------- | -------------------------------------------------------------- | --------- |
| Bun + Vite + React 19                                   | Fast dev loop, native TypeScript support, modern React         | ✓ Good    |
| Hono for API                                            | Lightweight, Zod-friendly, runs on Bun                         | ✓ Good    |
| Better Auth for auth                                    | Reduces custom auth code and supports email verification/reset | ✓ Good    |
| Drizzle ORM + PostgreSQL                                | Type-safe schema-first migrations and queries                  | ✓ Good    |
| Winston for server logging                              | Structured logs with Pino-style transport flexibility          | ✓ Good    |
| S3-compatible file storage                              | Uses `@workspace/files` with AWS S3 / floci S3 adapter         | ✓ Good    |
| PostgreSQL 16 Alpine                                    | User-selected stable version with smaller image                | ✓ Good    |
| Terraform EKS/ALB for AWS                               | Scalable managed Kubernetes with path-based routing            | — Pending |
| Cards versioned; closed cards spawn replacements        | Core trust model — immutable history                           | ✓ Good    |
| All AI changes via approval, tracked w/ approver + time | Auditability; business-safe                                    | ✓ Good    |
| pgvector embeddings in PostgreSQL                       | Semantic recall of closed cards; no new infra                  | ✓ Good    |
| Provider-agnostic AI (OpenAI default, mock for tests)   | No lock-in; deterministic E2E                                  | ✓ Good    |
| Org roles Owner/Admin/Member/Viewer                     | Standard, flexible access control                              | ✓ Good    |
| Billing deferred, designed for                          | Ship/validate first; slot in Stripe without rework             | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-08-02 after milestone v2.0 initialization_
