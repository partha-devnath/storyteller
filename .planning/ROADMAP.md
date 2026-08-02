# ROADMAP.md

**Project:** storyteller
**Milestone:** v2.0 — Living Requirements Board

## Phase 1: Core Loop (MVP Differentiator)

**Goal:** Ship the core loop — AI generates a story board from a prompt, users approve proposals, cards version and close (spawning replacements), all inside a multi-tenant org with a professional SaaS UI and E2E coverage.

**Mode:** mvp

**Requirements:**
AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08, ORG-01, ORG-02, ORG-03, ORG-04, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, APPR-01, APPR-02, APPR-03, APPR-04, VEC-01, VEC-02, VEC-03, VEC-04, UI-01, UI-02, UI-03, UI-04, UI-05, UI-07, E2E-01

**Success Criteria:**

1. A new user signs up, gets a personal org, creates a project, and types a product prompt; the mock AI generates story cards behind an approval proposal.
2. Approving a proposal makes cards live on a kanban board with version history; a card detail drawer shows diff, relations, and similar cards.
3. Closing a card freezes it; a later instruction targeting it creates a replacement card linked by evolution instead of updating it.
4. Cross-org isolation holds — a second user cannot see the first user's project.
5. E2E journeys pass end-to-end with the mock AI provider; unit + API + component tests pass.

**Status:** Complete (E2E-01 verified — 9/9 Playwright journeys pass with mock AI)

**Plans:** 8 plans

```
Plans:
- [x] 01-01-PLAN.md — Data model: 13 Drizzle tables + validations + pgvector infra + migration
- [x] 01-02-PLAN.md — @workspace/ai: LLMProvider (openai/mock/anthropic-stub), prompts, strict Zod output, operations
- [x] 01-03-PLAN.md — @workspace/vector: embedCard, semanticSearch, reindexCard (pgvector)
- [x] 01-04-PLAN.md — API foundation: org-scope/role middleware, orgs + projects routes, auth (personal org + invites)
- [x] 01-05-PLAN.md — AI + approval + cards routes: generate/process/clarify, proposal approve/reject, card CRUD/versions/similar/comments
- [x] 01-06-PLAN.md — Frontend core: landing, app shell, project dashboard, chat/generate panel, org members, hooks + store
- [x] 01-07-PLAN.md — Kanban board + Closed rail + drag-drop, proposal review + diff, card drawer (versions/diff/relations/similar)
- [x] 01-08-PLAN.md — E2E journeys: signup→org→project→prompt→proposal→approve→board→versions→close→replacement→isolation
```

## Phase 2: Graph & Collaboration Depth

**Goal:** Add the graph view (dependencies, hierarchy, evolution lineage), polished comments/mentions, real-time updates, and export — deepening collaboration and visibility.

**Mode:** standard

**Requirements:**
UI-06, DATA-04, E2E-02

**Success Criteria:**

1. Graph view renders cards/epics as nodes with color-coded dependency, hierarchy, and evolution edges; toggles filter edge types.
2. Clicking a node opens the card drawer; "impact of X" highlights downstream dependents.
3. Comments and @mentions flow works; updates arrive via SSE without full page reloads.
4. Export produces CSV, JSON, and Markdown files of the board.
5. E2E journeys for graph, comments/mentions, and export pass.

**Status:** Complete (E2E-02 verified — graph/comments/SSE/export journeys pass)

**Plans:** 5 plans

```
Plans:
- [x] 02-01-PLAN.md — API data layer: graph payload + SSE events + export routes, event bus, broadcast wiring
- [x] 02-02-PLAN.md — Frontend foundation: pin @xyflow/react/@dagrejs/dagre, shadcn primitives, edge tokens, view-switcher/export-menu/live-indicator + use-export/use-project-events
- [x] 02-03-PLAN.md — Graph view: dagre layout, custom nodes/edges, filter toggles, impact of X, lazy Graph tab
- [x] 02-04-PLAN.md — Comments/mentions + SSE live UI: useCardComments must-fix, comment components, new-comments pill, board toolbar wiring
- [x] 02-05-PLAN.md — E2E journeys: seeded graph fixture, J1 graph, J2 comments/mentions/SSE, J3 export
```

## Phase 3: SaaS Hardening

**Goal:** Add billing, usage limits, onboarding, analytics, and deployment polish — turning the product into a shippable SaaS.

**Mode:** standard

**Requirements:**
E2E-03

**Success Criteria:**

1. Subscription plans (free + paid) are selectable; plan limits are enforced.
2. Billing page and plan-limit enforcement E2E journeys pass.
3. Onboarding and analytics dashboards are available.
4. Staging/production deployment pipeline is documented and verified.

**Status:** Not started

---

## Phase Transition Log

| Date       | Phase | Action    | Notes                                                     |
| ---------- | ----- | --------- | --------------------------------------------------------- |
| 2026-08-02 | 1     | Created   | Milestone v2.0 roadmap initialized                        |
| 2026-08-02 | 1     | Completed | All 8 plans done; E2E-01 verified (9/9 journeys, mock AI) |
| 2026-08-02 | 2     | Completed | All 5 plans done; E2E-02 verified (12/12 journeys total)  |

---

_Last updated: 2026-08-02_
