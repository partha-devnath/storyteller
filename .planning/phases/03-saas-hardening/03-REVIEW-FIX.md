---
phase: 03
fixed_at: 2026-08-03T00:00:00Z
review_path: .planning/phases/03-saas-hardening/03-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-03T00:00:00Z
**Source review:** .planning/phases/03-saas-hardening/03-REVIEW.md
**Iteration:** 1

**Summary:**

- Findings in scope: 15
- Fixed: 15
- Skipped: 0

## Fixed Issues

### CR-01: Unauthenticated file access — IDOR on user uploads

**Files modified:** `apps/api/src/app.ts`
**Commit:** 4b5bf25
**Applied fix:** File GET endpoints now require an authenticated session and verify the caller owns the file (or is an accepted member of the owning org) before returning file metadata.

### CR-02: AI routes bypass org-scoping — cross-org proposal injection

**Files modified:** `apps/api/src/routes/ai.ts`
**Commit:** 32bc63e
**Applied fix:** AI proposal routes enforce org scoping — `projectSlug` is resolved and must belong to the caller's org before any proposal is persisted; proposals carry the caller's `orgId`.

### CR-03: Admin can self-promote to owner — org takeover

**Files modified:** `apps/api/src/routes/orgs.ts`
**Commit:** 9cdb0d8
**Applied fix:** Members can no longer change their own role, and only owners can grant the owner role — an admin cannot self-promote or promote another member to owner.

### CR-04: Card attachment fileIds never validated — cross-user file metadata leak

**Files modified:** `apps/api/src/routes/cards.ts`, `apps/api/src/services/apply-proposal.ts`
**Commit:** 7b69fe6
**Applied fix:** Card attachment `fileId`s are validated against the org's member uploads before insert; a file not owned by an org member is rejected with 403.

### WR-01: Pending invitees get full org access before accepting

**Files modified:** `apps/api/src/middleware/org-scope.ts`, `apps/api/src/routes/projects.ts`
**Commit:** 324bc17
**Applied fix:** Org scoping now denies access to members whose invite is still pending — a user must accept the invite (setting `inviteStatus = "accepted"`) before they can read or mutate org resources.

### WR-02: applyProposal update/close targets are not project-scoped

**Files modified:** `apps/api/src/services/apply-proposal.ts`
**Commit:** 14f33ca
**Applied fix:** Update and close change targets are looked up with both `targetCardId` and `projectId`, so a proposal cannot update or close a card outside its own project.

### WR-03: Mock billing webhook accepts unauthenticated, unvalidated events

**Files modified:** `apps/api/src/services/billing/mock-provider.ts`
**Commit:** 84f62bc
**Applied fix:** Mock webhook events are validated against a zod schema and rejected (not handled) when the payload does not match the expected shape.

### WR-04: assertLimit is check-then-insert — limits bypassable under concurrency

**Files modified:** `apps/api/src/services/plan-limits.ts`, `apps/api/src/services/usage.ts`, `apps/api/src/services/billing/subscription-transitions.ts`, `apps/api/src/routes/projects.ts`, `apps/api/src/routes/cards.ts`, `apps/api/src/routes/orgs.ts`, `apps/api/src/routes/templates.ts`, `apps/api/src/services/template-seed.ts`, `apps/api/src/routes/ai.ts`, `apps/api/src/services/apply-proposal.ts`
**Commit:** bb12b74
**Applied fix:** Added `assertLimitTx` which re-runs the metric count on the caller's transaction while holding a `FOR UPDATE` lock on the org row, closing the check-then-insert window. Callers (project create, card create, invite, template seed, AI persist, proposal apply) now wrap their insert and the limit check in one transaction.

### WR-05: cardVersion versionNo computed via max+1 — duplicate version race

**Files modified:** `apps/api/src/routes/cards.ts`, `apps/api/src/services/apply-proposal.ts`
**Commit:** 5b71d65
**Applied fix:** Card PATCH/close routes now run in a transaction that locks the card row `FOR UPDATE` before computing the next version number, serializing concurrent version creation. `applyProposal`'s update/close paths lock the target card the same way.

### WR-06: CI never runs the API unit test suite

**Files modified:** `.github/workflows/ci.yml`
**Commit:** b145535
**Applied fix:** Added an `api-test` CI job running `bun --filter api test` so the plan-limits / usage / subscription-transitions unit tests execute on every push and PR.

### WR-07: CI E2E job targets a missing script — job fails at dispatch

**Files modified:** `apps/e2e/package.json`
**Commit:** b145535
**Applied fix:** Added the `e2e` script (`playwright test`) so the turbo `e2e` task resolves and the E2E job runs instead of failing at dispatch.

### WR-08: GET /:id/billing creates Stripe sessions on every page load

**Files modified:** `apps/api/src/routes/billing.ts`
**Commit:** a01ed16
**Applied fix:** The billing read path is now read-only — it returns plan + usage without creating Stripe Checkout/Portal sessions. Sessions are only created on explicit client requests via `POST /billing/checkout` and `GET /billing/portal`.

### WR-09: Invite endpoint unrate-limited; invite tokens never expire

**Files modified:** `apps/api/src/routes/orgs.ts`, `packages/schemas/src/db/organization-member.ts`, `packages/db/migrations/0003_equal_grandmaster.sql`
**Commit:** 5119d63
**Applied fix:** Applied `rateLimiter(20, 60_000)` to the invite route. Added an `invite_expires_at` column (migration `0003`) set to now + 7 days on invite; the accept route rejects stale tokens.

### WR-10: Rate limiter keyed on direct TCP peer — breaks behind a reverse proxy

**Files modified:** `apps/api/src/middleware/rate-limit.ts`, `apps/api/src/env.ts`
**Commit:** f8eeb51
**Applied fix:** The limiter now honors `x-forwarded-for` (left-most client) only when the direct peer is in the env-configured `TRUSTED_PROXY` allowlist; forwarded headers from any other peer are ignored.

### WR-11: Downgrade dialog copy promises "end of billing cycle" — downgrade is immediate

**Files modified:** `apps/web/src/components/plan-change-dialog.tsx`
**Commit:** 42ec409
**Applied fix:** Aligned the dialog copy to the actual immediate behavior: "You'll lose Pro features immediately after confirming."

---

_Fixed: 2026-08-03T00:00:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
