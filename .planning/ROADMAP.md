# ROADMAP.md

**Project:** storyteller
**Milestone:** v1.0 — Template Release

## Phase 1: Core Monorepo & Auth

**Goal:** A working local full-stack auth template with database, migrations, file uploads, and email capture.

**Mode:** mvp

**Requirements:**
AUTH-01, AUTH-02, AUTH-03, AUTH-04, API-01, API-02, API-03, WEB-01, WEB-02, WEB-03, DB-01, DB-02, FILE-01, FILE-02, EMAIL-01, EMAIL-02

**Success Criteria:**

1. `bun install` completes without errors.
2. `docker compose up` starts PostgreSQL, Mailpit, api, and web.
3. User can sign up, verify email, sign in, and view the dashboard.
4. Database migrations generate and apply successfully.
5. File upload endpoint accepts files and records metadata.

**Status:** Complete

## Phase 2: AWS Infrastructure

**Goal:** Provision production-ready AWS infrastructure with ECR, EKS, and ALB.

**Mode:** standard

**Requirements:**
INFRA-01, INFRA-02, INFRA-03, INFRA-04

**Success Criteria:**

1. `terraform init` and `terraform plan` succeed in `infra/terraform/environments/dev`.
2. ECR repositories for api and web are defined.
3. VPC, EKS cluster, and ALB modules are wired without circular dependencies.
4. Dev and prod environment configurations are separate.

**Status:** Complete

## Phase 3: Developer Experience & Verification

**Goal:** Ensure the template builds, tests, and documents accurately.

**Mode:** standard

**Requirements:**
DX-01, DX-02, DX-03, DX-04

**Success Criteria:**

1. `bun run build` succeeds for all workspaces.
2. `bun run test` passes with no failures.
3. `bun run typecheck` passes with no errors.
4. README accurately reflects stack (Winston, floci S3, PostgreSQL 16, Terraform).

**Status:** In Progress

---

## Phase Transition Log

| Date       | Phase | Action      | Notes                                        |
| ---------- | ----- | ----------- | -------------------------------------------- |
| 2026-07-25 | 1     | Complete    | Existing codebase already satisfies criteria |
| 2026-07-25 | 2     | Complete    | Terraform modules added for ECR, EKS, ALB    |
| 2026-07-25 | 3     | In Progress | Build verification and graphify refresh      |

---

_Last updated: 2026-07-25_
