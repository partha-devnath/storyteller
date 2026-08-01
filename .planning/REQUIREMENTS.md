# Requirements: storyteller

**Defined:** 2026-08-02
**Milestone:** v2.0 — Living Requirements Board
**Core Value:** Business folks can describe an idea in natural language and get a clean, consistent, non-contradictory requirements board that AI keeps in sync — closed cards freeze, nothing is lost, every change is approved and auditable.

## v2 Requirements

Requirements for the Living Requirements Board milestone, derived from the approved design spec (`docs/superpowers/specs/2026-08-02-storyteller-design.md`).

### AI Engine

- [ ] **AI-01**: AI generates an initial board of epic/story cards from a natural-language prompt
- [ ] **AI-02**: AI asks clarifying questions instead of generating cards when a prompt/instruction is ambiguous
- [ ] **AI-03**: AI processes a new instruction into a proposal batch (create / update open card / close card)
- [ ] **AI-04**: AI never updates a closed card; it creates a replacement card with an evolution relation instead
- [ ] **AI-05**: AI runs a consistency review flagging contradictions, duplicates, and conflicts across cards
- [ ] **AI-06**: AI provider is pluggable (OpenAI default, Anthropic stub, mock for tests) via an LLMProvider interface
- [ ] **AI-07**: AI JSON output is validated against a strict Zod schema; malformed output is rejected with a friendly error
- [ ] **AI-08**: AI changes are never written directly to the database — only proposals are stored

### Organizations & Members

- [ ] **ORG-01**: User gets a personal org automatically on signup
- [ ] **ORG-02**: User can create additional organizations
- [ ] **ORG-03**: User can invite members by email; invitee joins via link and is assigned a role
- [ ] **ORG-04**: Org roles enforce permissions: owner, admin, member, viewer

### Data Model & Semantics

- [ ] **DATA-01**: Cards have standard agile fields (title, markdown description, acceptance criteria, status, priority, assignee, unique slug) plus custom fields (text/dropdown/date) defined per project
- [ ] **DATA-02**: Every card change creates an immutable card version; version history is always viewable
- [ ] **DATA-03**: Cards relate via three edge types: dependency, hierarchy (epic → story), evolution (closed → replacement)
- [ ] **DATA-04**: Cards support comments and @mentions, and unique deep-linkable URLs
- [ ] **DATA-05**: Cards support file attachments via the existing file upload
- [ ] **DATA-06**: All tables are org-scoped and timestamped; all actions record who and when

### Approval Flow

- [ ] **APPR-01**: AI proposals appear in an approval queue; a user approves or rejects the whole batch
- [ ] **APPR-02**: Approval/rejection records approver_id and timestamps, with optional rejection reason
- [ ] **APPR-03**: All AI-created new cards require explicit user approval before becoming live
- [ ] **APPR-04**: At approval time, each proposed change shows its diff, relation edges, and conflict badges against existing/closed cards

### Semantic Memory

- [ ] **VEC-01**: Cards (open and closed) are embedded (title + description + acceptance criteria + priority + tags) into pgvector
- [ ] **VEC-02**: AI receives semantic matches of relevant existing cards during generation/instruction processing
- [ ] **VEC-03**: Embeddings are recomputed when a card version is approved; closed-card embeddings persist
- [ ] **VEC-04**: Card detail shows semantically similar cards

### Frontend UI

- [ ] **UI-01**: Public landing page (21st.dev-inspired components, responsive, dark-mode aware)
- [ ] **UI-02**: Responsive authenticated app shell: collapsible sidebar with org switcher, topbar, user menu with role badge
- [ ] **UI-03**: Chat/generate panel — natural-language input, clarifying Q&A, proposal review
- [ ] **UI-04**: Kanban board view — configurable columns plus a read-only Closed rail; manual drag-and-drop applies directly; AI changes via approval
- [ ] **UI-05**: Card detail drawer — markdown body, acceptance criteria, custom fields, attachments, comments/mentions, version history + diff, relations tab, similar cards, copy link
- [ ] **UI-06**: Graph view — interactive node graph with color-coded edges (dependency/hierarchy/evolution), filter toggles, impact highlight
- [ ] **UI-07**: Project list dashboard and org members/settings pages (invite, roles)

### E2E Testing

- [ ] **E2E-01**: Phase 1 E2E journeys — signup → personal org → create project → prompt → mock AI generates cards → proposal → approve → board → card detail/versions → close card → replacement card → cross-user isolation
- [ ] **E2E-02**: Phase 2 E2E journeys — graph renders edges, comments/mentions flow, export produces files
- [ ] **E2E-03**: Phase 3 E2E journeys — billing page, plan-limit enforcement

## Future Requirements

Deferred to later milestones.

### Billing

- **BILL-01**: Subscription plans with Stripe; free tier + paid tier
- **BILL-02**: Usage limits enforced per plan
- **BILL-03**: Billing portal, invoices, plan change webhooks

### Collaboration Depth

- **COLLAB-01**: Real-time updates via websockets/SSE
- **COLLAB-02**: Notifications for mentions and proposal approvals
- **COLLAB-03**: Per-project member lists and roles

### SaaS Hardening

- **SAAS-01**: Onboarding tour and sample project templates
- **SAAS-02**: Usage analytics dashboards
- **SAAS-03**: Audit admin views

## Out of Scope

| Feature                           | Reason                                                   |
| --------------------------------- | -------------------------------------------------------- |
| Billing/subscription (v2.0)       | Deferred to Phase 3 within v2 roadmap or later milestone |
| Real-time websocket collaboration | SSE/polling in Phase 2, websockets later                 |
| Production OAuth/SSO providers    | Defer to product-specific integration                    |
| Mobile native app                 | Web-first, responsive                                    |
| Per-project member lists          | Org-wide access in v2.0                                  |
| Row-level security in Postgres    | Disciplined query scoping + isolation tests in v2.0      |

## Traceability

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| AI-01       | TBD   | Pending |
| AI-02       | TBD   | Pending |
| AI-03       | TBD   | Pending |
| AI-04       | TBD   | Pending |
| AI-05       | TBD   | Pending |
| AI-06       | TBD   | Pending |
| AI-07       | TBD   | Pending |
| AI-08       | TBD   | Pending |
| ORG-01      | TBD   | Pending |
| ORG-02      | TBD   | Pending |
| ORG-03      | TBD   | Pending |
| ORG-04      | TBD   | Pending |
| DATA-01     | TBD   | Pending |
| DATA-02     | TBD   | Pending |
| DATA-03     | TBD   | Pending |
| DATA-04     | TBD   | Pending |
| DATA-05     | TBD   | Pending |
| DATA-06     | TBD   | Pending |
| APPR-01     | TBD   | Pending |
| APPR-02     | TBD   | Pending |
| APPR-03     | TBD   | Pending |
| APPR-04     | TBD   | Pending |
| VEC-01      | TBD   | Pending |
| VEC-02      | TBD   | Pending |
| VEC-03      | TBD   | Pending |
| VEC-04      | TBD   | Pending |
| UI-01       | TBD   | Pending |
| UI-02       | TBD   | Pending |
| UI-03       | TBD   | Pending |
| UI-04       | TBD   | Pending |
| UI-05       | TBD   | Pending |
| UI-06       | TBD   | Pending |
| UI-07       | TBD   | Pending |
| E2E-01      | TBD   | Pending |
| E2E-02      | TBD   | Pending |
| E2E-03      | TBD   | Pending |

**Coverage:**

- v2 requirements: 36 total
- Mapped to phases: 0 (roadmap next)
- Unmapped: 36

---

_Requirements defined: 2026-08-02_
_Last updated: 2026-08-02 after milestone v2.0 initialization_
