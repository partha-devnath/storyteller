import { eq } from "drizzle-orm"
import { PLANS } from "@workspace/schemas"
import type { LimitMetric, PlanId } from "@workspace/schemas"
import { db } from "@workspace/db"
import { organization } from "@workspace/schemas"
import { getOrgPlan, getOrgPlanTx } from "./billing/subscription-transitions"
import {
  getUsage,
  countProjects,
  countAcceptedMembers,
  countAiActionsThisMonth,
  countCards,
} from "./usage"
import type { Executor } from "./usage"

/**
 * 402 error carrying the UI-SPEC limit payload. Status + public fields set
 * explicitly (no TS parameter properties — erasableSyntaxOnly).
 */
export class LimitError extends Error {
  status: number
  metric: LimitMetric
  limit: number
  usage: number

  constructor(metric: LimitMetric, limit: number, usage: number) {
    super("Limit reached")
    this.name = "LimitError"
    this.status = 402
    this.metric = metric
    this.limit = limit
    this.usage = usage
  }
}

/**
 * Pure limit decision — DB-free, unit-tested against the exact UI-SPEC
 * limits (free 2/5/50/500, pro null). `allowed` is true when the metric is
 * unlimited or usage is strictly below the limit.
 */
export function computeLimitDecision(
  plan: PlanId,
  metric: LimitMetric,
  usage: number
): { allowed: boolean; limit: number | null } {
  const limit = PLANS[plan].limits[metric]
  if (limit === null) return { allowed: true, limit: null }
  return { allowed: usage < limit, limit }
}

async function countMetric(
  executor: Executor,
  orgId: string,
  metric: LimitMetric
): Promise<number> {
  switch (metric) {
    case "projects":
      return countProjects(orgId, executor)
    case "members":
      return countAcceptedMembers(orgId, executor)
    case "aiActions":
      return countAiActionsThisMonth(orgId, executor)
    case "cards":
      return countCards(orgId, executor)
  }
}

/**
 * Server-side enforcement gate — throws LimitError (402) when the org is at
 * or over its plan limit for the metric. Plan comes from the server truth
 * (subscription row), usage from live org-scoped counters; the client can
 * never supply limits (T-03-11).
 */
export async function assertLimit(
  orgId: string,
  metric: LimitMetric
): Promise<void> {
  const plan = await getOrgPlan(orgId)
  const limit = PLANS[plan].limits[metric]
  if (limit === null) return
  const usage = (await getUsage(orgId))[metric]
  if (usage >= limit) throw new LimitError(metric, limit, usage)
}

/**
 * Transactional enforcement gate — the count is re-run on the caller's
 * transaction while holding a `FOR UPDATE` lock on the org row, so a
 * concurrent request cannot slip past the check and insert between the
 * count and the caller's write (WR-04 TOCTOU). Callers wrap their insert in
 * the same transaction passed here.
 */
export async function assertLimitTx(
  tx: Executor,
  orgId: string,
  metric: LimitMetric
): Promise<void> {
  await tx
    .select()
    .from(organization)
    .where(eq(organization.id, orgId))
    .for("update")
  const plan = await getOrgPlanTx(tx, orgId)
  const limit = PLANS[plan].limits[metric]
  if (limit === null) return
  const usage = await countMetric(tx, orgId, metric)
  if (usage >= limit) throw new LimitError(metric, limit, usage)
}
