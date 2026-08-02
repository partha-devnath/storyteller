import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm"
import { db } from "@workspace/db"
import { card, organizationMember, project, proposal } from "@workspace/schemas"
import type { LimitMetric } from "@workspace/schemas"

export type UsageState = Record<LimitMetric, number>

/**
 * Count projects for an org. Org-scoped by project.orgId — a missing
 * orgId filter would leak cross-org counts into limit decisions.
 */
export async function countProjects(orgId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(project)
    .where(eq(project.orgId, orgId))
  return row?.value ?? 0
}

/**
 * Count accepted members for an org. Only rows with a linked userId count —
 * pending invites (userId null) do not consume the members limit.
 */
export async function countAcceptedMembers(orgId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.orgId, orgId),
        isNotNull(organizationMember.userId)
      )
    )
  return row?.value ?? 0
}

/**
 * Count AI actions (proposals) created this calendar month for an org.
 * A proposal = one AI action (generate/process/clarify each persist one).
 * Resolves the org's project ids first, then counts proposals created at or
 * after the start of the current calendar month (UTC).
 */
export async function countAiActionsThisMonth(orgId: string): Promise<number> {
  const projectIds = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.orgId, orgId))
  if (projectIds.length === 0) return 0

  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )
  const [row] = await db
    .select({ value: count() })
    .from(proposal)
    .where(
      and(
        inArray(
          proposal.projectId,
          projectIds.map((p) => p.id)
        ),
        gte(proposal.createdAt, monthStart)
      )
    )
  return row?.value ?? 0
}

/**
 * Count cards across all of an org's projects. Counts open + closed cards —
 * both consume storage (UI-SPEC "cards" metric).
 */
export async function countCards(orgId: string): Promise<number> {
  const projectIds = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.orgId, orgId))
  if (projectIds.length === 0) return 0

  const [row] = await db
    .select({ value: count() })
    .from(card)
    .where(
      inArray(
        card.projectId,
        projectIds.map((p) => p.id)
      )
    )
  return row?.value ?? 0
}

/** Live per-org usage for all four limit metrics. */
export async function getUsage(orgId: string): Promise<UsageState> {
  const [projects, members, aiActions, cards] = await Promise.all([
    countProjects(orgId),
    countAcceptedMembers(orgId),
    countAiActionsThisMonth(orgId),
    countCards(orgId),
  ])
  return { projects, members, aiActions, cards }
}
