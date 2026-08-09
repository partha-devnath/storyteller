import { and, eq, max, count, isNull } from "drizzle-orm"
import { db } from "@workspace/db"
import {
  proposal,
  proposalChange,
  card,
  cardVersion,
  cardRelation,
  cardAttachment,
  epic,
  project,
  file as fileSchema,
  organizationMember,
} from "@workspace/schemas"
import { reindexCard } from "@workspace/vector"
import { aiProvider } from "@workspace/ai"
import { createLogger } from "@workspace/logger"
import { httpError } from "../middleware/org-scope"
import { assertLimitTx } from "./plan-limits"
import { nextCardKeyNo } from "./card-key"
import { publish } from "./event-bus"
import { generateId, slugify } from "../utils"
import type { ProposalChangeRelation } from "@workspace/schemas"

const logger = createLogger("api")

type ChangeRow = typeof proposalChange.$inferSelect

async function uniqueSlug(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  baseTitle: string
): Promise<string> {
  const base = slugify(baseTitle) || "card"
  let candidate = base
  let suffix = 2
  for (;;) {
    const [existing] = await tx
      .select({ id: card.id })
      .from(card)
      .where(and(eq(card.projectId, projectId), eq(card.slug, candidate)))
      .limit(1)
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

async function resolveEpic(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  epicName?: string
): Promise<string | null> {
  if (!epicName) return null
  const [existing] = await tx
    .select()
    .from(epic)
    .where(and(eq(epic.projectId, projectId), eq(epic.name, epicName)))
    .limit(1)
  if (existing) return existing.id
  const id = generateId()
  await tx.insert(epic).values({
    id,
    projectId,
    name: epicName,
    order: 0,
  })
  return id
}

async function nextVersionNo(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  cardId: string
): Promise<number> {
  const [row] = await tx
    .select({ maxNo: max(cardVersion.versionNo) })
    .from(cardVersion)
    .where(eq(cardVersion.cardId, cardId))
  return (row?.maxNo ?? 0) + 1
}

function readCreateFields(newData: Record<string, unknown>) {
  return {
    title: String(newData.title ?? "Untitled"),
    description: String(newData.description ?? ""),
    acceptanceCriteria: (newData.acceptanceCriteria as string[]) ?? [],
    status: (newData.status as typeof card.$inferSelect.status) ?? "backlog",
    priority:
      (newData.priority as typeof card.$inferSelect.priority) ?? "medium",
    epicName: newData.epicName as string | undefined,
    customFields: (newData.customFields as Record<string, string>) ?? null,
  }
}

async function applyChange(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  change: ChangeRow,
  approverId: string,
  reindexJobs: { cardId: string; versionId: string }[]
): Promise<number> {
  if (change.changeType === "create") {
    return applyCreate(tx, projectId, change, approverId, reindexJobs)
  }
  if (change.changeType === "update") {
    await applyUpdate(tx, projectId, change, approverId, reindexJobs)
    return 1
  }
  await applyClose(tx, projectId, change, approverId, reindexJobs)
  return 1
}

async function reindexSafe(cardId: string, versionId: string) {
  try {
    await reindexCard({ cardId, provider: aiProvider, versionId })
  } catch (error) {
    logger.warn({ cardId, error }, "proposal change: embedding reindex failed")
  }
}

export async function applyProposal({
  proposalId,
  approverId,
}: {
  proposalId: string
  approverId: string
}): Promise<{ applied: number }> {
  const reindexJobs: { cardId: string; versionId: string }[] = []

  const result = await db.transaction(async (tx) => {
    const [proposalRow] = await tx
      .select()
      .from(proposal)
      .where(eq(proposal.id, proposalId))
      .limit(1)
    if (!proposalRow) {
      throw httpError("Not Found", 404)
    }
    if (proposalRow.status !== "pending") {
      throw httpError("Proposal already resolved", 409)
    }

    const changes = await tx
      .select()
      .from(proposalChange)
      .where(eq(proposalChange.proposalId, proposalId))
      .orderBy(proposalChange.createdAt)

    let applied = 0
    for (const change of changes) {
      applied += await applyChange(
        tx,
        proposalRow.projectId,
        change,
        approverId,
        reindexJobs
      )
    }

    await tx
      .update(proposal)
      .set({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(proposal.id, proposalId))

    return { applied }
  })

  // Embedding reindex hits the network (NVIDIA). Running it inside the DB
  // transaction holds locks for the whole embed round-trip and deadlocks
  // concurrent approvals — so it runs after the transaction commits.
  for (const job of reindexJobs) {
    await reindexSafe(job.cardId, job.versionId)
  }

  return result
}

async function applyCreate(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  change: ChangeRow,
  approverId: string,
  reindexJobs: { cardId: string; versionId: string }[]
): Promise<number> {
  // Cards-limit gate: block approvals that would push the org over its card
  // limit (UI-SPEC V4 "Card creation via AI approval" row).
  const [proj] = await tx
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  if (proj) await assertLimitTx(tx, proj.orgId, "cards")

  const f = readCreateFields(change.newData)
  const epicId = await resolveEpic(tx, projectId, f.epicName)
  const slug = await uniqueSlug(tx, projectId, f.title)
  const keyNo = await nextCardKeyNo(tx, projectId)
  const cardId = generateId()
  await tx.insert(card).values({
    id: cardId,
    projectId,
    epicId,
    title: f.title,
    description: f.description,
    acceptanceCriteria: f.acceptanceCriteria,
    status: f.status,
    priority: f.priority,
    customFields: f.customFields,
    keyNo,
    slug,
  })
  const versionId = generateId()
  await tx.insert(cardVersion).values({
    id: versionId,
    cardId,
    versionNo: 1,
    title: f.title,
    description: f.description,
    acceptanceCriteria: f.acceptanceCriteria,
    status: f.status,
    priority: f.priority,
    customFields: f.customFields,
    changeType: "create",
    createdBy: approverId,
    sourceProposalChangeId: change.id,
  })
  await insertRelations(tx, projectId, change.relationSummary, cardId)
  await insertAttachments(tx, cardId, approverId, change.newData, proj.orgId)
  reindexJobs.push({ cardId, versionId })
  publish(projectId, {
    type: "card.created",
    card: { id: cardId, title: f.title, slug, status: f.status },
  })
  return 1
}

async function applyUpdate(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  change: ChangeRow,
  approverId: string,
  reindexJobs: { cardId: string; versionId: string }[]
): Promise<void> {
  const targetCardId = change.targetCardId
  if (!targetCardId) {
    logger.warn(
      { changeId: change.id },
      "applyProposal: update without target, skipping"
    )
    return
  }
  const [target] = await tx
    .select()
    .from(card)
    .where(and(eq(card.id, targetCardId), eq(card.projectId, projectId)))
    .for("update")
    .limit(1)
  if (!target) {
    logger.warn(
      { targetCardId },
      "applyProposal: target card missing, skipping"
    )
    return
  }
  if (target.isClosed) {
    throw httpError("Cannot update closed card", 409)
  }

  const fields = (change.newData ?? {}) as Record<string, unknown>
  const updates: Partial<typeof card.$inferInsert> = {}
  if (typeof fields.title === "string") updates.title = fields.title
  if (typeof fields.description === "string")
    updates.description = fields.description
  if (Array.isArray(fields.acceptanceCriteria)) {
    updates.acceptanceCriteria = fields.acceptanceCriteria as string[]
  }
  if (typeof fields.status === "string") {
    updates.status = fields.status as typeof card.$inferSelect.status
  }
  if (typeof fields.priority === "string") {
    updates.priority = fields.priority as typeof card.$inferSelect.priority
  }
  if (fields.customFields && typeof fields.customFields === "object") {
    updates.customFields = fields.customFields as Record<string, string>
  }
  updates.updatedAt = new Date()

  if (Object.keys(updates).length > 1) {
    await tx.update(card).set(updates).where(eq(card.id, targetCardId))
  }

  const versionNo = await nextVersionNo(tx, targetCardId)
  const versionId = generateId()
  await tx.insert(cardVersion).values({
    id: versionId,
    cardId: targetCardId,
    versionNo,
    title: updates.title ?? target.title,
    description: updates.description ?? target.description,
    acceptanceCriteria:
      (updates.acceptanceCriteria as string[]) ?? target.acceptanceCriteria,
    status:
      (updates.status as typeof cardVersion.$inferSelect.status) ??
      target.status,
    priority:
      (updates.priority as typeof cardVersion.$inferSelect.priority) ??
      target.priority,
    customFields:
      (updates.customFields as Record<string, string>) ?? target.customFields,
    changeType: "update",
    createdBy: approverId,
    sourceProposalChangeId: change.id,
  })
  await insertRelations(tx, projectId, change.relationSummary)
  reindexJobs.push({ cardId: targetCardId, versionId })
  publish(projectId, {
    type: "card.updated",
    card: {
      id: targetCardId,
      title: updates.title ?? target.title,
      slug: target.slug,
      status: (updates.status as string) ?? target.status,
      isClosed: target.isClosed,
    },
  })
}

async function applyClose(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  change: ChangeRow,
  approverId: string,
  reindexJobs: { cardId: string; versionId: string }[]
): Promise<void> {
  const targetCardId = change.targetCardId
  if (!targetCardId) return
  const [target] = await tx
    .select()
    .from(card)
    .where(and(eq(card.id, targetCardId), eq(card.projectId, projectId)))
    .for("update")
    .limit(1)
  if (!target) {
    logger.warn(
      { targetCardId },
      "applyProposal: close target missing, skipping"
    )
    return
  }
  if (target.isClosed) {
    logger.info({ targetCardId }, "applyProposal: already closed, idempotent")
    return
  }
  await tx
    .update(card)
    .set({
      isClosed: true,
      closedBy: approverId,
      closedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(card.id, targetCardId))
  const versionNo = await nextVersionNo(tx, targetCardId)
  const versionId = generateId()
  await tx.insert(cardVersion).values({
    id: versionId,
    cardId: targetCardId,
    versionNo,
    title: target.title,
    description: target.description,
    acceptanceCriteria: target.acceptanceCriteria,
    status: target.status,
    priority: target.priority,
    customFields: target.customFields,
    changeType: "close",
    createdBy: approverId,
    sourceProposalChangeId: change.id,
  })
  reindexJobs.push({ cardId: targetCardId, versionId })
  publish(projectId, {
    type: "card.updated",
    card: {
      id: targetCardId,
      title: target.title,
      slug: target.slug,
      status: target.status,
      isClosed: true,
    },
  })
}

async function insertRelations(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  relationSummary: ProposalChangeRelation[],
  newCardId?: string
): Promise<void> {
  if (!relationSummary || relationSummary.length === 0) return

  // Load the project's real card ids once — validates every endpoint before
  // insert (a dangling FK would roll back the whole proposal transaction).
  const existingCards = await tx
    .select({ id: card.id })
    .from(card)
    .where(eq(card.projectId, projectId))
  const knownIds = new Set(existingCards.map((c) => c.id))
  if (newCardId) knownIds.add(newCardId)

  const seen = new Set<string>()
  for (const rel of relationSummary) {
    let source = rel.sourceCardId
    let target = rel.targetCardId

    // Single-endpoint relations on a create change point at the new card:
    // the AI emits e.g. { type:"evolution", source_card_id:"<closed card>",
    // note:"replaces closed card" } and the other end is this card.
    if (newCardId && !source && target) {
      source = newCardId
    } else if (newCardId && source && !target) {
      target = newCardId
    }

    if (!source || !target || !knownIds.has(source) || !knownIds.has(target)) {
      continue
    }
    if (source === target) continue

    const key = `${source}|${target}|${rel.type}`
    if (seen.has(key)) continue
    seen.add(key)

    await tx.insert(cardRelation).values({
      id: generateId(),
      projectId,
      sourceCardId: source,
      targetCardId: target,
      type: rel.type,
    })
  }
}

async function insertAttachments(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  cardId: string,
  uploadedBy: string,
  newData: Record<string, unknown>,
  orgId: string
): Promise<void> {
  const fileIds = (newData.attachmentFileIds as string[]) ?? []
  for (const fileId of fileIds) {
    const [owned] = await tx
      .select({ id: fileSchema.id })
      .from(fileSchema)
      .innerJoin(
        organizationMember,
        eq(fileSchema.userId, organizationMember.userId)
      )
      .where(
        and(eq(fileSchema.id, fileId), eq(organizationMember.orgId, orgId))
      )
      .limit(1)
    if (!owned) throw httpError("Forbidden", 403)
    await tx.insert(cardAttachment).values({
      id: generateId(),
      cardId,
      fileId,
      uploadedBy,
    })
  }
}

export async function applyProposalChange({
  proposalId,
  changeId,
  approverId,
  mode,
  reason,
  projectId,
}: {
  proposalId: string
  changeId: string
  approverId: string
  mode: "approve" | "reject"
  reason?: string
  projectId: string
}): Promise<{
  applied: number
  proposalStatus: "pending" | "approved" | "rejected"
}> {
  const reindexJobs: { cardId: string; versionId: string }[] = []

  const result = await db.transaction(async (tx) => {
    const [proposalRow] = await tx
      .select()
      .from(proposal)
      .where(
        and(eq(proposal.id, proposalId), eq(proposal.projectId, projectId))
      )
      .limit(1)
    if (!proposalRow) throw httpError("Not Found", 404)
    if (proposalRow.status !== "pending") {
      throw httpError("Proposal already resolved", 409)
    }

    const [change] = await tx
      .select()
      .from(proposalChange)
      .where(
        and(
          eq(proposalChange.id, changeId),
          eq(proposalChange.proposalId, proposalId)
        )
      )
      .for("update")
      .limit(1)
    if (!change) throw httpError("Change not found", 404)
    if (change.approvedAt || change.rejectedAt) {
      throw httpError("Change already resolved", 409)
    }

    let applied = 0
    if (mode === "approve") {
      applied = await applyChange(
        tx,
        proposalRow.projectId,
        change,
        approverId,
        reindexJobs
      )
      await tx
        .update(proposalChange)
        .set({ approvedAt: new Date(), approverId })
        .where(eq(proposalChange.id, changeId))
    } else {
      await tx
        .update(proposalChange)
        .set({
          rejectedAt: new Date(),
          rejectionReason: reason ?? null,
          approverId,
        })
        .where(eq(proposalChange.id, changeId))
    }

    const [remaining] = await tx
      .select({ count: count() })
      .from(proposalChange)
      .where(
        and(
          eq(proposalChange.proposalId, proposalId),
          isNull(proposalChange.approvedAt),
          isNull(proposalChange.rejectedAt)
        )
      )
    const remainingCount = remaining?.count ?? 0

    let proposalStatus: "pending" | "approved" | "rejected" = "pending"
    if (remainingCount === 0) {
      const [rejectedCount] = await tx
        .select({ count: count() })
        .from(proposalChange)
        .where(
          and(
            eq(proposalChange.proposalId, proposalId),
            isNull(proposalChange.approvedAt)
          )
        )
      const [totalCount] = await tx
        .select({ count: count() })
        .from(proposalChange)
        .where(eq(proposalChange.proposalId, proposalId))
      const rejected = rejectedCount?.count ?? 0
      const allRejected = rejected > 0 && rejected === (totalCount?.count ?? 0)
      proposalStatus = allRejected ? "rejected" : "approved"
      await tx
        .update(proposal)
        .set({
          status: proposalStatus,
          approvedBy: approverId,
          rejectedAt: proposalStatus === "rejected" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(proposal.id, proposalId))
    }

    return { applied, proposalStatus }
  })

  for (const job of reindexJobs) {
    await reindexSafe(job.cardId, job.versionId)
  }
  return result
}
