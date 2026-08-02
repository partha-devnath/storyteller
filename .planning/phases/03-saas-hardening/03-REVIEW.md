---
phase: 03-saas-hardening
reviewed: 2026-08-03T00:00:00Z
depth: standard
files_reviewed: 60
files_reviewed_list:
  - apps/api/src/app.ts
  - apps/api/src/env.ts
  - apps/api/src/middleware/error-handler.ts
  - apps/api/src/middleware/rate-limit.ts
  - apps/api/src/routes/ai.ts
  - apps/api/src/routes/analytics.ts
  - apps/api/src/routes/billing.ts
  - apps/api/src/routes/cards.ts
  - apps/api/src/routes/orgs.ts
  - apps/api/src/routes/projects.ts
  - apps/api/src/routes/templates.ts
  - apps/api/src/services/analytics.ts
  - apps/api/src/services/apply-proposal.ts
  - apps/api/src/services/billing-state.ts
  - apps/api/src/services/billing/mock-provider.ts
  - apps/api/src/services/billing/provider.ts
  - apps/api/src/services/billing/stripe-provider.ts
  - apps/api/src/services/billing/subscription-transitions.ts
  - apps/api/src/services/plan-limits.ts
  - apps/api/src/services/template-seed.ts
  - apps/api/src/services/usage.ts
  - apps/e2e/src/core-loop.test.ts
  - apps/e2e/src/saas.test.ts
  - apps/e2e/src/seed.ts
  - apps/web/src/App.tsx
  - apps/web/src/components/app-shell.tsx
  - apps/web/src/components/bar-chart.tsx
  - apps/web/src/components/billing.tsx
  - apps/web/src/components/env-indicator.tsx
  - apps/web/src/components/limit-banner.tsx
  - apps/web/src/components/plan-cards.tsx
  - apps/web/src/components/plan-change-dialog.tsx
  - apps/web/src/components/protected-route.tsx
  - apps/web/src/components/stat-card.tsx
  - apps/web/src/components/template-card.tsx
  - apps/web/src/components/toaster.tsx
  - apps/web/src/components/usage-meters.tsx
  - apps/web/src/hooks/use-analytics.ts
  - apps/web/src/hooks/use-billing.ts
  - apps/web/src/hooks/use-onboarding.ts
  - apps/web/src/lib/api-client.ts
  - apps/web/src/providers/app-provider.tsx
  - apps/web/src/routes/analytics.tsx
  - apps/web/src/routes/billing.tsx
  - apps/web/src/routes/onboarding.tsx
  - apps/web/src/routes/org-members.tsx
  - apps/web/src/routes/project-chat.tsx
  - apps/web/src/routes/projects.tsx
  - apps/web/src/stores/toast-store.ts
  - packages/schemas/src/db/subscription.ts
  - packages/schemas/src/index.ts
  - packages/schemas/src/plans.ts
  - packages/schemas/src/validations/billing.ts
  - packages/ui/src/components/button.tsx
  - .github/workflows/ci.yml
findings:
  critical: 4
  warning: 11
  info: 6
  total: 21
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-08-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 60
**Status:** issues_found

## Summary

Reviewed all 60 changed files for the SaaS Hardening phase (billing, plan limits, onboarding, analytics, deployment) at standard depth, with cross-file tracing of org-scoping, webhook, and limit-enforcement paths.

Billing/limit machinery is largely solid: Stripe webhook signature verification, 402 LimitError serialization, server-side assertLimit gates, template-seed transaction, and org-scoped analytics aggregation are all correct. The failure surface is concentrated in **org-scope enforcement gaps**:

1. **AI routes decouple middleware project resolution from body projectSlug** — cross-org proposal injection (CR-02).
2. **Unauthenticated file endpoints** — IDOR on uploaded files (CR-01), compounded by unvalidated attachment fileIds (CR-04).
3. **Admin self-promotion to owner** — org takeover chain (CR-03).
4. **Pending invitees get full org access before accepting** (WR-01) and **applyProposal target cards are not project-scoped** (WR-02).
5. CI has two structural gaps: API `bun test` suite never runs (WR-06) and the E2E job targets a non-existent script (WR-07).

4 critical, 11 warnings, 6 info.

## Critical Issues

### CR-01: Unauthenticated file access — IDOR on user uploads

**File:** `apps/api/src/app.ts:207-231`
**Issue:** `GET /api/files/raw/:id` and `GET /api/files/:id` perform no session or ownership check. Any unauthenticated client that knows a file id can download the raw object (`storage.serve(record.storedName)`) and read full metadata (userId, originalName, path, storedName, url). File uploads are user-private — the DELETE endpoint (line 249) enforces `record.userId === session.user.id` — so read access without any check is inconsistent broken access control. File ids become reachable via card attachments (see CR-04), making the attack chain practical.
**Fix:** Require a session and verify the caller owns the file (or shares an org with the owner) on both GET endpoints:

```ts
app.get("/api/files/raw/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ success: false, error: "Unauthorized" }, 401)
  const id = c.req.param("id")
  const [record] = await db.select().from(fileSchema).where(eq(fileSchema.id, id)).limit(1)
  if (!record) return c.json({ success: false, error: "File not found" }, 404)
  if (record.userId !== session.user.id) return c.json({ success: false, error: "Forbidden" }, 403)
  return storage.serve(record.storedName)
})
```

### CR-02: AI routes bypass org-scoping — cross-org proposal injection

**File:** `apps/api/src/routes/ai.ts:51-59, 107-112, 164-169, 236-241`
**Issue:** `aiRoutes.use("*", resolveOrgFromProject, ...)` resolves and authorizes the project from the **query** param (`?project=`), but every handler then re-resolves `resolveProjectId(body.projectSlug)` from the **body** and persists the proposal against that id. `assertLimit(c.var.orgId!)` gates the query project's org, not the body project's org. An attacker sends `?project=<own-project>` (membership verified) with body `projectSlug=<foreign-project>` — membership is never checked for the body project, so the proposal row is inserted into a foreign org's project and the foreign org's `aiActions` quota is consumed. Direct violation of the T-03-20 org-scoping priority.
**Fix:** Drop the body re-resolution entirely and use the middleware-resolved `c.var.projectId`; or validate `resolveProjectId(body.projectSlug)` equals `c.var.projectId` and 403 on mismatch:

```ts
const projectId = c.var.projectId!
const resolved = await resolveProjectId(body.projectSlug)
if (resolved !== projectId) throw httpError("Forbidden", 403)
```

### CR-03: Admin can self-promote to owner — org takeover

**File:** `apps/api/src/routes/orgs.ts:206-255`
**Issue:** `PATCH /:id/members/:userId` is gated by `requireRole("owner", "admin")` and sets `role` on **any** target row, including the requester's own membership. An admin PATCHes their own id with `role: "owner"` (the last-owner guard at line 233 only triggers when the **target** is currently owner). With two owners now present, the admin demotes the original owner to member (guard passes since `owners.length > 1`), becoming the sole owner. Full org takeover by an admin.
**Fix:** Forbid role changes on one's own membership, and restrict granting `owner` to current owners only:

```ts
if (targetUserId === c.var.userId) throw httpError("Cannot change your own role", 400)
if (role === "owner" && c.var.role !== "owner") {
  throw httpError("Only owners can grant owner", 403)
}
```

### CR-04: Card attachment fileIds never validated — cross-user file metadata leak

**File:** `apps/api/src/routes/cards.ts:95-102`, `apps/api/src/services/apply-proposal.ts:382-397`
**Issue:** `body.attachmentFileIds` (create-card) and `newData.attachmentFileIds` (apply-proposal) are inserted into `cardAttachment` without any check that the file exists, belongs to the requester, or belongs to the org. An attacker attaches another user's fileId to their own card; `GET /api/cards/:id` then returns that file's `url` and `originalName`, and with CR-01 the raw bytes are fetchable without auth. File metadata + content disclosure across users.
**Fix:** Before inserting each attachment, verify the file row exists and is owned by the caller's org:

```ts
const owned = await db
  .select({ id: fileSchema.id })
  .from(fileSchema)
  .innerJoin(organizationMember, eq(fileSchema.userId, organizationMember.userId))
  .where(and(eq(fileSchema.id, fileId), eq(organizationMember.orgId, c.var.orgId!)))
  .limit(1)
if (!owned.length) throw httpError("Forbidden", 403)
```

## Warnings

### WR-01: Pending invitees get full org access before accepting

**File:** `apps/api/src/middleware/org-scope.ts:18-30` (also `apps/api/src/routes/projects.ts:34-49`)
**Issue:** `findMembership` filters only on `(orgId, userId)` — not on `inviteStatus`. Invites to already-registered users are inserted with `userId` set and `inviteStatus: "pending"` (orgs.ts:119-128). Those users can immediately call `requireOrg`-gated endpoints (billing, analytics, templates, member lists) and create projects without ever accepting the invite, bypassing the accept flow entirely.
**Fix:** Filter membership to accepted rows:

```ts
.eq(organizationMember.inviteStatus, "accepted")
```

### WR-02: applyProposal update/close targets are not project-scoped

**File:** `apps/api/src/services/apply-proposal.ts:228-242, 309-326`
**Issue:** `applyUpdate`/`applyClose` load the target card by `eq(card.id, targetCardId)` with no `projectId` constraint against the proposal's project. `targetCardId` originates from AI-generated output (prompt-injectable via board content). If a crafted response references a card id from another org, approval would update/close a foreign card. `applyCreate` is safe (new id); update/close are not.
**Fix:** Scope the lookup to the proposal's project:

```ts
const [target] = await tx
  .select()
  .from(card)
  .where(and(eq(card.id, targetCardId), eq(card.projectId, projectId)))
  .limit(1)
if (!target) throw httpError("Not Found", 404)
```

### WR-03: Mock billing webhook accepts unauthenticated, unvalidated events

**File:** `apps/api/src/services/billing/mock-provider.ts:25-47`, `packages/schemas/src/env.ts` (default `BILLING_PROVIDER = "mock"`)
**Issue:** The webhook path validates only that `type` and `orgId` are strings. `plan` is trusted from the body with no enum check — `{type:"checkout.session.completed", orgId, plan:"pro"}` grants any org Pro for free, `plan:"garbage"` corrupts the subscription row (later `PLANS[plan].limits` throws → 500s on every limit check). The endpoint has no auth and `BILLING_PROVIDER` defaults to `"mock"`, so a deployment that forgets to set it exposes arbitrary plan manipulation on the public webhook route.
**Fix:** Validate the event body with a zod schema (`SubscriptionEvent`-shaped: `type` enum, `plan` enum `free|pro`), and fail closed (`handled:false` / 400) on anything else:

```ts
const eventSchema = z.object({
  type: z.enum(["checkout.session.completed", "subscription.updated", "subscription.deleted"]),
  orgId: z.string(),
  plan: z.enum(["free", "pro"]).optional(),
  // ...
})
```

### WR-04: assertLimit is check-then-insert — limits bypassable under concurrency

**File:** `apps/api/src/services/plan-limits.ts:47-56`
**Issue:** `assertLimit` reads usage, then the caller inserts — no transaction, no row lock, no unique constraint tied to the limit. Two concurrent `POST /api/projects` on a free org at 2/2 projects both pass the check and both insert (org ends at 4 projects). Same TOCTOU applies to cards, members, and aiActions (proposal persist). The limit is advisory, not enforced.
**Fix:** Move the count+insert into one transaction with `SELECT ... FOR UPDATE` on the org row (or subscription row) so concurrent requests serialize:

```ts
await db.transaction(async (tx) => {
  const [lock] = await tx.select().from(organization).where(eq(organization.id, orgId)).for("update")
  const usage = ... // count within tx
  if (usage >= limit) throw new LimitError(metric, limit, usage)
  await tx.insert(project).values(...)
})
```

### WR-05: cardVersion versionNo computed via max+1 — duplicate version race

**File:** `apps/api/src/routes/cards.ts:42-48`, `apps/api/src/services/apply-proposal.ts:68-77`
**Issue:** `nextVersionNo` reads `max(versionNo)` then inserts +1 outside any lock. Two concurrent PATCHes to the same card both compute the same next number; if `(cardId, versionNo)` is unique, one insert throws (500 to the user); if not, version history silently interleaves. `applyProposal`'s variant has the same race but inside its transaction (still unlocked).
**Fix:** Serialize per-card version creation (row lock on the card within the transaction) or use a `(cardId, versionNo)` unique index with retry-on-conflict.

### WR-06: CI never runs the API unit test suite

**File:** `.github/workflows/ci.yml:68-84`, `vitest.config.ts` (root)
**Issue:** Root `test` script is `vitest run` and the root vitest config **excludes** `apps/api/**`. The API's tests use `bun test` (`apps/api/package.json` `"test": "bun test"`), which nothing in CI invokes. The plan-limits / usage / subscription-transitions unit tests referenced in code comments never execute in CI.
**Fix:** Add a CI job (or extend the test job) running `bun --filter api test`:

```yaml
  api-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: "1.3.5" }
      - run: bun install --frozen-lockfile
      - run: bun --filter api test
```

### WR-07: CI E2E job targets a missing script — job fails at dispatch

**File:** `.github/workflows/ci.yml:133-136`, `apps/e2e/package.json`
**Issue:** `bun run test:e2e` → `turbo e2e --filter=e2e`. The e2e workspace has no `e2e` script (only `test`, `test:ui`, `test:headed`), and turbo requires the package script for the task. The E2E job errors out before any test runs.
**Fix:** Add the script to `apps/e2e/package.json`:

```json
"e2e": "playwright test"
```

### WR-08: GET /:id/billing creates Stripe sessions on every page load

**File:** `apps/api/src/routes/billing.ts:28-55`
**Issue:** The billing read path (any org member, no rate limit) calls `createCheckoutSession` (free orgs) or `createPortalSession` (pro orgs) on **every** GET. In stripe mode each refresh creates a new Stripe Checkout session (and potentially a new Customer, since `customer`/`customer_email` are never passed — duplicate customers per org), and each pro page view opens a new Portal session. Costly, rateable, and unnecessary for a read.
**Fix:** Return session URLs only when the client explicitly requests them (separate POST endpoints), or memoize/cache the session URL per org for a few minutes; pass `customer` / `customer_email` to reuse existing customers.

### WR-09: Invite endpoint unrate-limited; invite tokens never expire

**File:** `apps/api/src/routes/orgs.ts:84-142`
**Issue:** `POST /:id/invite` (owner/admin) has no rate limiter — a compromised admin account (or an owner going rogue) can email-bomb arbitrary addresses, and each invite sends an email through the provider. `inviteToken` has no expiry: the accept route (line 160) only checks `inviteStatus === "pending"`, so a leaked token from months ago still grants membership.
**Fix:** Apply `rateLimiter(...)` to the invite route; add a token expiry timestamp and reject stale tokens.

### WR-10: Rate limiter keyed on direct TCP peer — breaks behind a reverse proxy

**File:** `apps/api/src/middleware/rate-limit.ts:24-46`
**Issue:** `getConnInfo(c).remote.address` returns the direct socket peer. Behind any reverse proxy (nginx/caddy — the deployment context this phase adds), every client shares the proxy IP, so all users collapse into one bucket per route. A single client can exhaust the shared AI/auth bucket and 429 the entire user base; conversely an attacker hiding behind the proxy is indistinguishable. No `X-Forwarded-For` handling exists.
**Fix:** Accept `x-forwarded-for` only when the request arrives from a trusted proxy (env-configured allowlist), and key on the forwarded client address:

```ts
const fwd = c.req.header("x-forwarded-for")
address = trustedProxy ? fwd?.split(",")[0]?.trim() ?? address : address
```

### WR-11: Downgrade dialog copy promises "end of billing cycle" — downgrade is immediate

**File:** `apps/web/src/components/plan-change-dialog.tsx:36-40`, `apps/api/src/routes/billing.ts:90-120`
**Issue:** The dialog states "You'll lose Pro features at the end of the billing cycle", but `POST /:id/billing/downgrade` calls `setOrgPlan(orgId, "free")` immediately — plan flips on the next request, and any over-limit org is hard-blocked by the banner right away. The copy misrepresents the behavior (and there is no Stripe-side cancellation of the subscription either — a paid pro customer downgrading keeps their Stripe subscription active and billing).
**Fix:** Either align the copy to "immediately" or implement the deferred transition (cancel Stripe subscription, flip plan at `currentPeriodEnd`).

## Info

### IN-01: Stale rate-limit doc comment

**File:** `apps/api/src/middleware/rate-limit.ts:7`
**Issue:** Doc comment claims "AI (100/60s)" but `apps/api/src/app.ts:133` defaults to 10/60s. Comment is misleading.
**Fix:** Update the comment to the actual default.

### IN-02: plan-cards limit copy duplicates PLANS source of truth

**File:** `apps/web/src/components/plan-cards.tsx:15-27`
**Issue:** `FREE_LIMIT_ROWS`/`PRO_LIMIT_ROWS` hardcode the same numbers as `PLANS` in `packages/schemas/src/plans.ts`. Any plan change requires editing both places; they currently match, but nothing enforces it.
**Fix:** Derive the rows from `PLANS` at render time, or add a unit test asserting the copy matches `PLANS`.

### IN-03: analytics `range` query validated then ignored

**File:** `apps/api/src/routes/analytics.ts:19-25`
**Issue:** The `range` param is zod-validated but its value is never used — `getAnalytics(orgId, 30)` hardcodes 30 days. The schema only allows `"30d"`, so it's harmless, but the param is dead surface.
**Fix:** Drop the query param and schema, or honor the parsed range.

### IN-04: Security headers (incl. CSP) applied to API JSON responses

**File:** `apps/api/src/app.ts:51-68`
**Issue:** The API serves JSON only; CSP/HSTS headers on API responses are inert (no HTML documents). The web app's CSP is the one that matters, and `connect-src 'self'` there would break cross-origin API calls in dev. The header middleware suggests protection that isn't actually applied where it counts.
**Fix:** Move the CSP to the web server/document response and keep only API-relevant headers (X-Content-Type-Options, HSTS) on the API.

### IN-05: `trialing` subscription status mapped to "canceled"

**File:** `apps/api/src/services/billing/stripe-provider.ts:31-38`
**Issue:** `mapStripeStatus` maps `trialing` (along with `paused`, `incomplete`, `unpaid`) to `"canceled"`. If trials are ever configured, trial subscriptions would be treated as canceled and the org dropped from pro.
**Fix:** Map `trialing` to `"active"` (or add a distinct status) if trials are a possibility.

### IN-06: `validateEnv()` runs after `./app` import

**File:** `apps/api/src/index.ts:1-7`
**Issue:** `import app from "./app"` executes module-scope code (S3 storage construction from raw `process.env`) before `validateEnv()` exits on invalid env. Harmless today (storage creation is lazy) but the validation ordering is fragile.
**Fix:** Call `validateEnv()` at the top of `app.ts` before building storage, or import app lazily after validation.

---

_Reviewed: 2026-08-03T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
