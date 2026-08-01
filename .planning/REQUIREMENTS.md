# Requirements: storyteller

**Defined:** 2026-07-25
**Core Value:** A developer can clone this template, run `bun install && docker compose up && bun dev`, and immediately have a working local auth stack, database migrations, and a deployable application structure.

## v1 Requirements

Requirements for the initial template release.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can reset password via email link
- [ ] **AUTH-04**: User session persists across browser refresh

### API

- [ ] **API-01**: API exposes health check endpoint
- [ ] **API-02**: API serves Better Auth endpoints
- [ ] **API-03**: API validates environment variables on startup

### Frontend

- [ ] **WEB-01**: User can navigate login, signup, forgot-password, and reset-password pages
- [ ] **WEB-02**: Dashboard route is protected for authenticated users
- [ ] **WEB-03**: Error boundary catches runtime errors

### Database

- [ ] **DB-01**: Drizzle schema defines users, sessions, accounts, and verifications
- [ ] **DB-02**: Migrations can be generated and applied from the workspace

### Storage

- [ ] **FILE-01**: Authenticated users can upload files via multipart form
- [ ] **FILE-02**: File metadata is stored in the database

### Email

- [ ] **EMAIL-01**: Verification and password reset emails are sent in development
- [ ] **EMAIL-02**: Emails are captured by Mailpit for local inspection

### Infrastructure

- [ ] **INFRA-01**: Terraform modules provision ECR repositories for api and web
- [ ] **INFRA-02**: Terraform modules provision VPC and EKS cluster
- [ ] **INFRA-03**: Terraform modules provision ALB with path-based routing
- [ ] **INFRA-04**: Separate dev and prod environment configurations exist

### Developer Experience

- [ ] **DX-01**: `bun install` resolves all workspace dependencies
- [ ] **DX-02**: `bun run build` builds all packages and apps
- [ ] **DX-03**: `bun run test` runs tests with Vitest
- [ ] **DX-04**: `docker compose up` starts all required services

## v2 Requirements

Deferred to future release.

### DevOps

- **DEVOPS-01**: CI/CD pipeline builds and pushes container images to ECR
- **DEVOPS-02**: Kubernetes manifests for api and web deployments
- **DEVOPS-03**: HTTPS listener with ACM certificate on ALB
- **DEVOPS-04**: Automated database migrations on deploy

### Auth

- **AUTH-05**: OAuth login (Google, GitHub)
- **AUTH-06**: Two-factor authentication

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-tenant architecture | Template targets single-tenant applications |
| Billing/subscription logic | Not a SaaS billing template |
| Real-time collaboration | WebSocket infrastructure not included |
| Mobile app | Web-first template |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| API-01 | Phase 1 | Pending |
| API-02 | Phase 1 | Pending |
| API-03 | Phase 1 | Pending |
| WEB-01 | Phase 1 | Pending |
| WEB-02 | Phase 1 | Pending |
| WEB-03 | Phase 1 | Pending |
| DB-01 | Phase 1 | Pending |
| DB-02 | Phase 1 | Pending |
| FILE-01 | Phase 1 | Pending |
| FILE-02 | Phase 1 | Pending |
| EMAIL-01 | Phase 1 | Pending |
| EMAIL-02 | Phase 1 | Pending |
| INFRA-01 | Phase 2 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Pending |
| INFRA-04 | Phase 2 | Pending |
| DX-01 | Phase 3 | Pending |
| DX-02 | Phase 3 | Pending |
| DX-03 | Phase 3 | Pending |
| DX-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-25*
*Last updated: 2026-07-25 after initial definition*
