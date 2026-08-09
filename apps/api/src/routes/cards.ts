import { Hono } from "hono"
import { eq, and, or, asc, desc, max } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import {
  card,
  cardVersion,
  cardRelation,
  comment,
  cardAttachment,
  file as fileSchema,
  user as userSchema,
  organizationMember,
  integrationCredential,
  project,
} from "@workspace/schemas"
import {
  createCardSchema,
  updateCardSchema,
  closeCardSchema,
} from "@workspace/schemas/validations/card"
import { z } from "zod"
import { aiProvider } from "@workspace/ai"
import { semanticSearch } from "@workspace/vector"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { publish } from "../services/event-bus"
import { assertLimitTx } from "../services/plan-limits"
import { nextCardKeyNo } from "../services/card-key"
import { decryptConfig } from "../services/credential-crypto"
import { realProviders, githubAuthFromConfig } from "../services/providers"
import {
  syncCardCommentToGithub,
  buildCardDiffLines,
} from "../services/github-sync"
import { generateId, slugify } from "../utils"
import type { AppEnv } from "../middleware/env"

export const cardsRoutes = new Hono<AppEnv>()
cardsRoutes.onError(errorHandler)

const commentSchema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).optional(),
})

cardsRoutes.use("*", resolveOrgFromProject)

async function nextVersionNo(
  executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  cardId: string
): Promise<number> {
  const [row] = await executor
    .select({ maxNo: max(cardVersion.versionNo) })
    .from(cardVersion)
    .where(eq(cardVersion.cardId, cardId))
  return (row?.maxNo ?? 0) + 1
}

async function loadCardInProject(cardId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(card)
    .where(
      and(
        eq(card.projectId, projectId),
        or(eq(card.id, cardId), eq(card.slug, cardId))
      )
    )
    .limit(1)
  return row
}

cardsRoutes.post("/", requireRole("owner", "admin", "member"), async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const projectId = c.var.projectId!
  const raw = (await c.req.json()) as Record<string, unknown>
  const body = createCardSchema.parse({ ...raw, projectId })

  const cardId = generateId()
  const slug = slugify(body.title) || "card"
  await db.transaction(async (tx) => {
    await assertLimitTx(tx, c.var.orgId!, "cards")

    const keyNo = await nextCardKeyNo(tx, projectId)
    await tx.insert(card).values({
      id: cardId,
      projectId,
      epicId: body.epicId ?? null,
      title: body.title,
      description: body.description ?? "",
      acceptanceCriteria: body.acceptanceCriteria ?? [],
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId ?? null,
      customFields: body.customFields ?? null,
      sections: body.sections ?? null,
      keyNo,
      slug,
    })
    await tx.insert(cardVersion).values({
      id: generateId(),
      cardId,
      versionNo: 1,
      title: body.title,
      description: body.description ?? "",
      acceptanceCriteria: body.acceptanceCriteria ?? [],
      status: body.status,
      priority: body.priority,
      customFields: body.customFields ?? null,
      changeType: "create",
      createdBy: session.user.id,
    })
    for (const fileId of body.attachmentFileIds ?? []) {
      const [owned] = await tx
        .select({ id: fileSchema.id })
        .from(fileSchema)
        .innerJoin(
          organizationMember,
          eq(fileSchema.userId, organizationMember.userId)
        )
        .where(
          and(
            eq(fileSchema.id, fileId),
            eq(organizationMember.orgId, c.var.orgId!)
          )
        )
        .limit(1)
      if (!owned) throw httpError("Forbidden", 403)
      await tx.insert(cardAttachment).values({
        id: generateId(),
        cardId,
        fileId,
        uploadedBy: session.user.id,
      })
    }
  })

  publish(projectId, {
    type: "card.created",
    card: { id: cardId, title: body.title, slug, status: body.status },
  })

  return c.json({ success: true, data: { id: cardId, slug } }, 201)
})

cardsRoutes.patch(
  "/:id",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const cardId = c.req.param("id")

    const body = updateCardSchema.parse(await c.req.json())

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(card)
        .where(eq(card.id, cardId))
        .for("update")
      if (!locked) throw httpError("Not Found", 404)
      if (locked.isClosed) throw httpError("Closed cards are immutable", 409)

      const updates: Partial<typeof card.$inferInsert> = {
        updatedAt: new Date(),
      }
      if (body.title !== undefined) updates.title = body.title
      if (body.description !== undefined) updates.description = body.description
      if (body.acceptanceCriteria !== undefined) {
        updates.acceptanceCriteria = body.acceptanceCriteria
      }
      if (body.status !== undefined) updates.status = body.status
      if (body.priority !== undefined) updates.priority = body.priority
      if (body.customFields !== undefined)
        updates.customFields = body.customFields
      if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId

      await tx.update(card).set(updates).where(eq(card.id, cardId))

      await tx.insert(cardVersion).values({
        id: generateId(),
        cardId,
        versionNo: await nextVersionNo(tx, cardId),
        title: updates.title ?? locked.title,
        description: updates.description ?? locked.description,
        acceptanceCriteria:
          (updates.acceptanceCriteria as string[]) ?? locked.acceptanceCriteria,
        status:
          (updates.status as typeof cardVersion.$inferSelect.status) ??
          locked.status,
        priority:
          (updates.priority as typeof cardVersion.$inferSelect.priority) ??
          locked.priority,
        customFields:
          (updates.customFields as Record<string, string>) ??
          locked.customFields,
        changeType: "update",
        createdBy: session.user.id,
      })

      return { card: locked }
    })

    publish(projectId, {
      type: "card.updated",
      card: {
        id: cardId,
        title: body.title ?? result.card.title,
        slug: result.card.slug,
        status: (body.status as string) ?? result.card.status,
        isClosed: result.card.isClosed,
      },
    })

    const diffLines = buildCardDiffLines(
      {
        title: result.card.title,
        description: result.card.description ?? "",
        status: result.card.status,
        priority: result.card.priority,
        acceptanceCriteria: result.card.acceptanceCriteria ?? [],
      },
      {
        title: (body.title as string) ?? result.card.title,
        description:
          (body.description as string) ?? result.card.description ?? "",
        status: (body.status as string) ?? result.card.status,
        priority: (body.priority as string) ?? result.card.priority,
        acceptanceCriteria:
          (body.acceptanceCriteria as string[]) ??
          result.card.acceptanceCriteria ??
          [],
      }
    )
    if (diffLines.length > 0) {
      await syncCardCommentToGithub({
        projectId,
        cardId,
        lines: diffLines,
      })
    }

    return c.json({ success: true, data: { id: cardId } })
  }
)

cardsRoutes.post(
  "/:id/close",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const cardId = c.req.param("id")

    const body = closeCardSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!body.success) {
      throw httpError(body.error.issues.map((i) => i.message).join("; "), 400)
    }

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(card)
        .where(eq(card.id, cardId))
        .for("update")
      if (!locked) throw httpError("Not Found", 404)
      if (locked.isClosed) return { card: locked, alreadyClosed: true }

      await tx
        .update(card)
        .set({
          isClosed: true,
          closedBy: session.user.id,
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(card.id, cardId))
      await tx.insert(cardVersion).values({
        id: generateId(),
        cardId,
        versionNo: await nextVersionNo(tx, cardId),
        title: locked.title,
        description: locked.description,
        acceptanceCriteria: locked.acceptanceCriteria,
        status: locked.status,
        priority: locked.priority,
        customFields: locked.customFields,
        changeType: "close",
        createdBy: session.user.id,
      })

      return { card: locked, alreadyClosed: false }
    })

    if (result.alreadyClosed) {
      return c.json({ success: true, data: { id: cardId, closed: true } })
    }

    publish(projectId, {
      type: "card.updated",
      card: {
        id: cardId,
        title: result.card.title,
        slug: result.card.slug,
        status: result.card.status,
        isClosed: true,
      },
    })

    await syncCardCommentToGithub({
      projectId,
      cardId,
      lines: [`**Card closed**: status "${result.card.status}" → "closed"`],
    })

    return c.json({ success: true, data: { id: cardId, closed: true } })
  }
)

cardsRoutes.get("/:id", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)

  const [latest] = await db
    .select()
    .from(cardVersion)
    .where(eq(cardVersion.cardId, cardId))
    .orderBy(desc(cardVersion.versionNo))
    .limit(1)

  const relations = await db
    .select({
      id: cardRelation.id,
      type: cardRelation.type,
      sourceCardId: cardRelation.sourceCardId,
      targetCardId: cardRelation.targetCardId,
    })
    .from(cardRelation)
    .where(eq(cardRelation.projectId, projectId))

  const comments = await db
    .select({
      id: comment.id,
      body: comment.body,
      parentId: comment.parentId,
      mentions: comment.mentions,
      userId: userSchema.id,
      userName: userSchema.name,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(userSchema, eq(comment.userId, userSchema.id))
    .where(eq(comment.cardId, cardId))
    .orderBy(asc(comment.createdAt))

  const attachments = await db
    .select({
      id: cardAttachment.id,
      fileId: fileSchema.id,
      url: fileSchema.url,
      originalName: fileSchema.originalName,
    })
    .from(cardAttachment)
    .innerJoin(fileSchema, eq(cardAttachment.fileId, fileSchema.id))
    .where(eq(cardAttachment.cardId, cardId))

  return c.json({
    success: true,
    data: {
      card: target,
      latestVersion: latest,
      relations,
      comments,
      attachments,
    },
  })
})

cardsRoutes.get("/:id/versions", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)
  const versions = await db
    .select()
    .from(cardVersion)
    .where(eq(cardVersion.cardId, target.id))
    .orderBy(desc(cardVersion.versionNo))
  return c.json({ success: true, data: versions })
})

cardsRoutes.get("/:id/similar", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)
  const query = `${target.title}\n${target.description ?? ""}`
  const matches = await semanticSearch({
    projectId,
    query,
    provider: aiProvider,
    limit: 7,
  })
  const filtered = matches.filter((m) => m.cardId !== cardId).slice(0, 6)
  return c.json({ success: true, data: filtered })
})

cardsRoutes.post(
  "/:id/comments",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) throw httpError("Unauthorized", 401)
    const projectId = c.var.projectId!
    const cardId = c.req.param("id")
    const target = await loadCardInProject(cardId, projectId)
    if (!target) throw httpError("Not Found", 404)
    const body = commentSchema.parse(await c.req.json())
    const id = generateId()
    await db.insert(comment).values({
      id,
      cardId,
      userId: session.user.id,
      body: body.body,
      parentId: body.parentId ?? null,
      mentions: body.mentions ?? [],
    })

    publish(projectId, {
      type: "comment.created",
      cardId,
      comment: {
        id,
        body: body.body,
        parentId: body.parentId ?? null,
        mentions: body.mentions ?? [],
        userId: session.user.id,
        userName: session.user.name,
        createdAt: new Date().toISOString(),
      },
    })

    return c.json({ success: true, data: { id } }, 201)
  }
)

cardsRoutes.get("/:id/comments", async (c) => {
  const projectId = c.var.projectId!
  const cardId = c.req.param("id")
  const target = await loadCardInProject(cardId, projectId)
  if (!target) throw httpError("Not Found", 404)
  const comments = await db
    .select({
      id: comment.id,
      body: comment.body,
      parentId: comment.parentId,
      mentions: comment.mentions,
      userId: userSchema.id,
      userName: userSchema.name,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .innerJoin(userSchema, eq(comment.userId, userSchema.id))
    .where(eq(comment.cardId, cardId))
    .orderBy(asc(comment.createdAt))
  return c.json({ success: true, data: comments })
})

cardsRoutes.get("/:id/external/:linkId", async (c) => {
  const cardId = c.req.param("id")
  const linkId = c.req.param("linkId")
  const projectId = c.var.projectId!
  const [cardRow] = await db
    .select()
    .from(card)
    .where(and(eq(card.id, cardId), eq(card.projectId, projectId)))
    .limit(1)
  if (!cardRow) throw httpError("Not Found", 404)
  const link = cardRow.externalLinks.find((l) => l.id === linkId)
  if (!link) throw httpError("External link not found", 404)

  const [cred] = await db
    .select()
    .from(integrationCredential)
    .where(eq(integrationCredential.id, link.credentialId))
    .limit(1)
  if (!cred) throw httpError("Credential not found", 404)
  const config = decryptConfig(cred.config)

  if (cred.provider === "github") {
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1)
    const column = proj?.columns.find((col) => col.key === link.columnKey)
    const repo = column?.integration?.target
    if (!repo) throw httpError("Column integration missing", 404)
    const issue = await realProviders.github.fetchIssue({
      auth: githubAuthFromConfig(config),
      repo,
      issueNumber: link.externalId,
    })
    return c.json({ success: true, data: issue })
  }

  const trello = await realProviders.trello.fetchCard({
    apiKey: config.apiKey,
    token: config.token,
    cardId: link.externalId,
  })
  return c.json({ success: true, data: trello })
})
