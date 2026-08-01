# 01-04 Plan Summary — API Foundation + Auth (Org/Project spine)

Status: **Complete**

## Tasks Executed

### Task 1 — Middleware

- `middleware/env.ts`: shared `AppEnv` type (Variables: requestId, orgId, role, userId, projectId?, body?) + `OrgRole`
- `middleware/org-scope.ts`:
  - `requireOrg` — session via `auth.api.getSession` (401 if none); resolves orgId from query / JSON body (POST/PATCH/PUT) / `:id` param; membership lookup on (orgId, userId) → 403 (no existence leak); sets orgId/role/userId
  - `resolveOrgFromProject` — session → resolve project by `projectId`/`project` query or `:slug` param → membership on project.orgId → sets projectId
  - `httpError(message, status)` helper for thrown errors with `.status`
- `middleware/role-guard.ts`: `requireRole(...roles)` — 403 "Forbidden: insufficient role" if `c.var.role` not included (viewer blocked from writes at each write route)
- `middleware/validate.ts`: `validateBody(schema)` — Zod safeParse → 400 joined issues on failure; sets `c.var.body`
- `middleware/error-handler.ts`: shared `errorHandler` (Hono `onError`) — normalizes thrown `.status` errors into the `{ success, error }` envelope (needed because mounted sub-apps isolate throws from the parent try/catch middleware)

### Task 2 — Org + project routes

- `routes/orgs.ts` (`orgsRoutes`, `onError(errorHandler)`):
  - POST / → create org + owner membership (201)
  - GET / → list my orgs (join member→org)
  - POST /:id/invite → requireOrg + requireRole(owner,admin); 409 if already a member; resolves invitee by email; inserts member (userId or invitedEmail) + inviteToken; sends invite email; 201
  - POST /invites/accept → token lookup → 404 invalid; binds to session user (403 mismatch); accepts
  - GET /:id/members → list members join user
  - PATCH /:id/members/:userId → requireRole(owner,admin); last-owner demotion guard (400)
  - DELETE /:id/members/:userId → requireRole(owner,admin); last-owner removal guard (400)
- `routes/projects.ts` (`projectsRoutes`, `onError(errorHandler)`):
  - POST / → membership + role check (owner/admin/member); insert project with default 5 columns
  - GET /?orgId= → requireOrg → list projects with cardCount + lastActivity subqueries
  - GET /:slug → resolveOrgFromProject → project + epics + card summaries (acceptanceCriteria length via json_array_length)
- `app.ts`: registered `app.route("/api/orgs", orgsRoutes)` + `app.route("/api/projects", projectsRoutes)` after the auth handler

### Task 3 — Personal org hook + invite email + AI env + tests

- `packages/auth/src/server.ts`: added `databaseHooks.user.create.after` — creates a personal org (`<name>'s Workspace`, slug `user-<id8>`) + owner membership on signup (ORG-01); failures logged, never break signup
- `packages/email/src/index.ts`: extended `EmailSender` with `sendInviteEmail({ email, url, orgName })` implemented in console, mailpit, resend providers
- `apps/api/src/env.ts`: AI block — `AI_PROVIDER` (enum, default "mock"), `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` optional, `EMBEDDING_MODEL`/`CHAT_MODEL` defaults (dev runs without keys)
- `__tests__/orgs.test.ts` (bun:test): 4 DB-free cases — 401 on GET/POST/invite without session, 400 on invalid body (missing name)
- `__tests__/app.test.ts`: existing (health, protected) still pass

## Verification Results

| Check                                                     | Result                           |
| --------------------------------------------------------- | -------------------------------- |
| `bun --filter @workspace/email typecheck && lint && test` | ✅ pass (6 tests)                |
| `bun --filter @workspace/auth typecheck && lint`          | ✅ pass                          |
| `bun --filter @workspace/schemas typecheck`               | ✅ pass                          |
| `bun --filter api typecheck && lint`                      | ✅ pass                          |
| `bun --filter api test` (bun:test)                        | ✅ 6 tests pass (2 app + 4 orgs) |
| grep `export default` in new middleware/routes            | ✅ 0                             |

## Notes / Deviations

- **Sub-app error isolation**: Hono mounted sub-apps (`app.route`) catch thrown errors internally and return 500 before the parent try/catch middleware sees them. Added a shared `errorHandler` (Hono `onError`) applied to each route sub-app to normalize thrown `.status` errors into the response envelope. The parent error middleware remains for non-mounted routes.
- **Session lookup**: route handlers import `auth` at top-level (not dynamic import) for session resolution.
- Fixed pre-existing template lint: auth server unused `url` callback params; api app.ts `remote` useless-assignment; email test unused `emailSender` (added `toBeDefined()` assertion).
- DB-backed flows (create org, invite accept, cross-org isolation) are covered by E2E in plan 01-08; unit tests stay DB-free per the plan.

## Commit History (this plan)

- feat(api): add org/project middleware, routes, auth hook, invite email, AI env
