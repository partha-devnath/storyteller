import { Hono } from "hono"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import { proposal, proposalChange, project } from "@workspace/schemas"
import type {
  ProposalChangeRelation,
  ProposalChangeConflictFlag,
} from "@workspace/schemas"
import {
  aiProvider,
  generateBoard,
  processInstruction,
  answerClarifyingQuestions,
} from "@workspace/ai"
import {
  buildBoardSnapshot,
  buildSemanticContext,
} from "../services/board-snapshot"
import { chatHistorySearch } from "@workspace/vector"
import {
  mapStoriesToChanges,
  buildReplySummaryText,
} from "../services/story-mapping"
import type { ProposalSummary } from "../services/story-mapping"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { publish } from "../services/event-bus"
import { assertLimitTx } from "../services/plan-limits"
import { generateId } from "../utils"
import type { AppEnv } from "../middleware/env"

export const aiRoutes = new Hono<AppEnv>()
aiRoutes.onError(errorHandler)

const generateSchema = z.object({
  projectSlug: z.string().min(1),
  prompt: z.string().min(1).max(4000),
})

const processSchema = z.object({
  projectSlug: z.string().min(1),
  instruction: z.string().min(1).max(4000),
  mentions: z
    .array(
      z.object({
        type: z.enum(["card", "member"]),
        id: z.string().min(1),
        label: z.string().min(1),
      })
    )
    .optional()
    .default([]),
})

const clarifySchema = z.object({
  projectSlug: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  priorAnswers: z.string(),
  prompt: z.string().min(1),
})

async function resolveProjectId(projectSlug: string): Promise<string> {
  const [row] = await db
    .select()
    .from(project)
    .where(eq(project.slug, projectSlug))
    .limit(1)
  if (!row) throw httpError("Not Found", 404)
  return row.id
}

async function loadCardSections(projectId: string): Promise<{ key: string }[]> {
  const [row] = await db
    .select({ cardSections: project.cardSections })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  return row?.cardSections ?? []
}

function persistProposal(params: {
  orgId: string
  projectId: string
  userId: string
  instruction: string
  promptText: string
  aiResponse: string
  changes: Array<{
    changeType: "create" | "update" | "close"
    targetCardId?: string
    newData: Record<string, unknown>
    relationSummary?: ProposalChangeRelation[]
    conflictFlags?: ProposalChangeConflictFlag[]
  }>
}): Promise<{ proposalId: string; changeCount: number }> {
  const proposalId = generateId()
  return db.transaction(async (tx) => {
    await assertLimitTx(tx, params.orgId, "aiActions")
    await tx.insert(proposal).values({
      id: proposalId,
      projectId: params.projectId,
      createdBy: params.userId,
      instruction: params.instruction,
      prompt: params.promptText,
      aiResponse: params.aiResponse,
      status: "pending",
    })
    for (const change of params.changes) {
      await tx.insert(proposalChange).values({
        id: generateId(),
        proposalId,
        changeType: change.changeType,
        targetCardId: change.targetCardId ?? null,
        newData: change.newData,
        relationSummary: change.relationSummary ?? [],
        conflictFlags: change.conflictFlags ?? [],
      })
    }
    return { proposalId, changeCount: params.changes.length }
  })
}

aiRoutes.use(
  "*",
  resolveOrgFromProject,
  requireRole("owner", "admin", "member")
)

aiRoutes.post("/generate", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const body = generateSchema.parse(await c.req.json())
  const projectId = c.var.projectId!
  const resolved = await resolveProjectId(body.projectSlug)
  if (resolved !== projectId) throw httpError("Forbidden", 403)

  const snapshot = await buildBoardSnapshot(projectId)
  const semantic = await buildSemanticContext({
    projectId,
    instruction: body.prompt,
    provider: aiProvider,
  })
  const chatHistory = await chatHistorySearch({
    projectId,
    query: body.prompt,
    provider: aiProvider,
  })
  const result = await generateBoard({
    provider: aiProvider,
    prompt: body.prompt,
    snapshot,
    semanticMatches: semantic,
    chatHistory,
  })

  if (result.kind === "clarifying") {
    return c.json({
      success: true,
      data: { kind: "clarifying", questions: result.questions },
    })
  }

  const cardSections = await loadCardSections(projectId)
  const knownCardIds = new Set(snapshot.cards.map((c) => c.id))
  const { changes, skipped } = mapStoriesToChanges({
    epics: result.epics,
    cardSections,
    knownCardIds,
  })

  const created = await persistProposal({
    orgId: c.var.orgId!,
    projectId,
    userId: session.user.id,
    instruction: body.prompt,
    promptText: body.prompt,
    aiResponse: JSON.stringify(result),
    changes,
  })

  publish(c.var.projectId!, {
    type: "proposal.ready",
    proposalId: created.proposalId,
  })

  const summary: ProposalSummary = {
    created: changes.filter((c) => c.changeType === "create").length,
    updated: changes.filter((c) => c.changeType === "update").length,
    skipped,
  }

  return c.json(
    {
      success: true,
      data: {
        kind: "board",
        proposal: created,
        summary,
        summaryText: buildReplySummaryText(summary),
      },
    },
    201
  )
})

aiRoutes.post("/process", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const body = processSchema.parse(await c.req.json())
  const projectId = c.var.projectId!
  const resolved = await resolveProjectId(body.projectSlug)
  if (resolved !== projectId) throw httpError("Forbidden", 403)

  const semantic = await buildSemanticContext({
    projectId,
    instruction: body.instruction,
    provider: aiProvider,
  })
  const snapshot = await buildBoardSnapshot(projectId)

  // Resolve @mentioned cards to their titles so the AI can act on them.
  const cardRefs = body.mentions.filter((m) => m.type === "card")
  const instructionWithMentions =
    cardRefs.length > 0
      ? `${body.instruction}\n\nReferenced cards:\n${cardRefs
          .map((m) => `- ${m.label} (${m.id})`)
          .join("\n")}`
      : body.instruction

  const chatHistory = await chatHistorySearch({
    projectId,
    query: body.instruction,
    provider: aiProvider,
  })

  const batch = await processInstruction({
    provider: aiProvider,
    instruction: instructionWithMentions,
    snapshot,
    semanticMatches: semantic,
    chatHistory,
  })

  const changes = batch.changes.map((change) => {
    if (change.changeType === "create") {
      return {
        changeType: "create" as const,
        newData: {
          title: change.card.title,
          description: change.card.description,
          acceptanceCriteria: change.card.acceptanceCriteria,
          status: change.card.status,
          priority: change.card.priority,
          epicName: change.card.epicName,
          customFields: change.card.customFields,
          sections: change.card.sections,
        },
        relationSummary: change.relationSummary,
        conflictFlags: change.conflictFlags,
      }
    }
    if (change.changeType === "update") {
      return {
        changeType: "update" as const,
        targetCardId: change.targetCardId,
        newData: change.fields,
        relationSummary: change.relationSummary,
        conflictFlags: change.conflictFlags,
      }
    }
    return {
      changeType: "close" as const,
      targetCardId: change.targetCardId,
      newData: { reason: change.reason },
      relationSummary: change.relationSummary,
      conflictFlags: change.conflictFlags,
    }
  })

  const created = await persistProposal({
    orgId: c.var.orgId!,
    projectId,
    userId: session.user.id,
    instruction: body.instruction,
    promptText: body.instruction,
    aiResponse: JSON.stringify(batch),
    changes,
  })

  publish(c.var.projectId!, {
    type: "proposal.ready",
    proposalId: created.proposalId,
  })

  return c.json({ success: true, data: { proposal: created } }, 201)
})

aiRoutes.post("/clarify", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const body = clarifySchema.parse(await c.req.json())
  const projectId = c.var.projectId!
  const resolved = await resolveProjectId(body.projectSlug)
  if (resolved !== projectId) throw httpError("Forbidden", 403)

  const snapshot = await buildBoardSnapshot(projectId)
  const semantic = await buildSemanticContext({
    projectId,
    instruction: body.prompt,
    provider: aiProvider,
  })
  const chatHistory = await chatHistorySearch({
    projectId,
    query: body.prompt,
    provider: aiProvider,
  })
  const result = await answerClarifyingQuestions({
    provider: aiProvider,
    prompt: body.prompt,
    question: body.question,
    answer: body.answer,
    priorAnswers: body.priorAnswers,
    snapshot,
    semanticMatches: semantic,
    chatHistory,
  })

  if (result.kind === "clarifying") {
    return c.json({
      success: true,
      data: { kind: "clarifying", questions: result.questions },
    })
  }

  const cardSections = await loadCardSections(projectId)
  const knownCardIds = new Set(snapshot.cards.map((c) => c.id))
  const { changes, skipped } = mapStoriesToChanges({
    epics: result.epics,
    cardSections,
    knownCardIds,
  })

  const created = await persistProposal({
    orgId: c.var.orgId!,
    projectId,
    userId: session.user.id,
    instruction: body.prompt,
    promptText: body.prompt,
    aiResponse: JSON.stringify(result),
    changes,
  })
  publish(c.var.projectId!, {
    type: "proposal.ready",
    proposalId: created.proposalId,
  })

  const summary: ProposalSummary = {
    created: changes.filter((c) => c.changeType === "create").length,
    updated: changes.filter((c) => c.changeType === "update").length,
    skipped,
  }

  return c.json(
    {
      success: true,
      data: {
        kind: "board",
        proposal: created,
        summary,
        summaryText: buildReplySummaryText(summary),
      },
    },
    201
  )
})
