import { and, eq, gte, inArray } from "drizzle-orm"
import { db } from "@workspace/db"
import { card, comment, project, proposal } from "@workspace/schemas"
import type { AnalyticsState } from "@workspace/schemas"

export type DailyPoint = { date: string; value: number }
export type AnalyticsSeries = DailyPoint[]

/** UTC date key — YYYY-MM-DD (ISO slice). */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Pure series builder — buckets rows into `rangeDays` daily buckets ending
 * today (UTC), each { date: "YYYY-MM-DD", value: count of rows with
 * createdAt in [dayStart, dayEnd) }. Deterministic, no DB. Today's partial
 * day counts as a bucket; rows outside the window are excluded.
 */
export function buildDailySeries(
  rows: { createdAt: Date }[],
  rangeDays: number
): DailyPoint[] {
  const now = new Date()
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const windowStart = new Date(
    todayStart.getTime() - (rangeDays - 1) * 86_400_000
  )
  const windowEnd = new Date(todayStart.getTime() + 86_400_000)

  const counts = new Map<string, number>()
  for (const row of rows) {
    const t = row.createdAt.getTime()
    if (t < windowStart.getTime() || t >= windowEnd.getTime()) continue
    const key = dayKey(row.createdAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const series: DailyPoint[] = []
  for (let i = 0; i < rangeDays; i++) {
    const dayStart = new Date(windowStart.getTime() + i * 86_400_000)
    series.push({
      date: dayKey(dayStart),
      value: counts.get(dayKey(dayStart)) ?? 0,
    })
  }
  return series
}

/** Pure sum of series values. */
export function computeTotals(series: DailyPoint[]): number {
  return series.reduce((acc, point) => acc + point.value, 0)
}

/**
 * Org-scoped 30-day analytics aggregation (UI-SPEC V5 / AnalyticsState).
 * All aggregations filter projectIds by the authenticated orgId (inArray),
 * so another org's rows can never appear (T-03-20). Fixed 30d window —
 * no user-controlled range expansion (T-03-23).
 */
export async function getAnalytics(
  orgId: string,
  rangeDays = 30
): Promise<AnalyticsState> {
  const now = new Date()
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const windowStart = new Date(
    todayStart.getTime() - (rangeDays - 1) * 86_400_000
  )

  const projectIds = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.orgId, orgId))
  const ids = projectIds.map((p) => p.id)

  if (ids.length === 0) {
    // UI-SPEC V5c empty state path — zeroed series, generatedAt now.
    const empty = buildDailySeries([], rangeDays)
    return {
      totals: {
        cardsCreated: 0,
        proposalsApproved: 0,
        commentsPosted: 0,
        activeMembers: 0,
      },
      series: {
        cardsCreated: empty,
        proposalsApproved: empty,
        commentsPosted: empty,
      },
      generatedAt: now.toISOString(),
    }
  }

  const cardRows = await db
    .select({ createdAt: card.createdAt })
    .from(card)
    .where(and(inArray(card.projectId, ids), gte(card.createdAt, windowStart)))
  const cardsCreated = buildDailySeries(cardRows, rangeDays)

  const proposalRows = await db
    .select({ approvedAt: proposal.approvedAt })
    .from(proposal)
    .where(
      and(
        inArray(proposal.projectId, ids),
        eq(proposal.status, "approved"),
        gte(proposal.approvedAt, windowStart)
      )
    )
  const proposalsApproved = buildDailySeries(
    proposalRows
      .map((r) => (r.approvedAt ? { createdAt: r.approvedAt } : null))
      .filter((r): r is { createdAt: Date } => r !== null),
    rangeDays
  )

  const commentRows = await db
    .select({ createdAt: comment.createdAt })
    .from(comment)
    .innerJoin(card, eq(comment.cardId, card.id))
    .where(
      and(inArray(card.projectId, ids), gte(comment.createdAt, windowStart))
    )
  const commentsPosted = buildDailySeries(commentRows, rangeDays)

  // activeMembers = | union of distinct userIds | over approved proposals
  // (approvedAt in range) and comments (createdAt in range), org-scoped.
  const proposers = await db
    .selectDistinct({ userId: proposal.createdBy })
    .from(proposal)
    .where(
      and(
        inArray(proposal.projectId, ids),
        eq(proposal.status, "approved"),
        gte(proposal.approvedAt, windowStart)
      )
    )
  const commenters = await db
    .selectDistinct({ userId: comment.userId })
    .from(comment)
    .innerJoin(card, eq(comment.cardId, card.id))
    .where(
      and(inArray(card.projectId, ids), gte(comment.createdAt, windowStart))
    )
  const activeMembers = new Set([
    ...proposers.map((p) => p.userId),
    ...commenters.map((c) => c.userId),
  ]).size

  return {
    totals: {
      cardsCreated: computeTotals(cardsCreated),
      proposalsApproved: computeTotals(proposalsApproved),
      commentsPosted: computeTotals(commentsPosted),
      activeMembers,
    },
    series: { cardsCreated, proposalsApproved, commentsPosted },
    generatedAt: new Date().toISOString(),
  }
}
