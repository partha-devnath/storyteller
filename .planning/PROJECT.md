# storyteller

## What This Is

A production-ready full-stack monorepo template built with **Bun**, **Vite**, **React 19**, **Hono**, **Better Auth**, **Drizzle ORM**, and **PostgreSQL**. It provides a working starting point for authenticated web applications with email flows, S3-compatible file uploads, structured logging, and AWS infrastructure via Terraform.

## Core Value

A developer can clone this template, run `bun install && docker compose up && bun dev`, and immediately have a working local auth stack, database migrations, and a deployable application structure.

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

- [ ] Add Terraform infrastructure for AWS deployment (ECR, EKS, ALB)
- [ ] Refresh project documentation to match current stack
- [ ] Keep graphify knowledge graph in sync with code changes
- [ ] Maintain CI/CD pipeline and build verification

### Out of Scope

- Production-grade SSO/OAuth providers — defer to product-specific integration
- Multi-tenant architecture — template targets single-tenant apps
- Billing/subscription logic — not a SaaS template
- Custom UI design system — uses shadcn/ui defaults

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

| Decision                   | Rationale                                                      | Outcome   |
| -------------------------- | -------------------------------------------------------------- | --------- |
| Bun + Vite + React 19      | Fast dev loop, native TypeScript support, modern React         | ✓ Good    |
| Hono for API               | Lightweight, Zod-friendly, runs on Bun                         | ✓ Good    |
| Better Auth for auth       | Reduces custom auth code and supports email verification/reset | ✓ Good    |
| Drizzle ORM + PostgreSQL   | Type-safe schema-first migrations and queries                  | ✓ Good    |
| Winston for server logging | Structured logs with Pino-style transport flexibility          | ✓ Good    |
| S3-compatible file storage | Uses `@workspace/files` with AWS S3 / floci S3 adapter         | ✓ Good    |
| PostgreSQL 16 Alpine       | User-selected stable version with smaller image                | ✓ Good    |
| Terraform EKS/ALB for AWS  | Scalable managed Kubernetes with path-based routing            | — Pending |

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

_Last updated: 2026-07-25 after GSD project initialization_
