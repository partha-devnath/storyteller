import type {
  LLMProvider,
  BoardSnapshot,
  SemanticMatch,
  ProposalBatch,
  CreateChange,
  UpdateChange,
} from "../types"
import { processInstructionOutputSchema } from "../schemas"
import { buildProcessInstructionPrompt } from "../prompts/process-instruction"
import { AiOutputError } from "../errors"
import { createLogger } from "@workspace/logger"

const logger = createLogger("ai/process-instruction")

export async function processInstruction({
  provider,
  instruction,
  snapshot,
  semanticMatches,
}: {
  provider: LLMProvider
  instruction: string
  snapshot: BoardSnapshot
  semanticMatches: SemanticMatch[]
}): Promise<ProposalBatch> {
  const messages = buildProcessInstructionPrompt({
    instruction,
    snapshot,
    semanticMatches,
  })
  const raw = await provider.chat(messages)
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    throw new AiOutputError(
      "The AI returned a malformed instruction result. Please try again."
    )
  }
  const parsed = processInstructionOutputSchema.safeParse(parsedJson)

  if (!parsed.success) {
    throw new AiOutputError(
      "The AI returned a malformed instruction result. Please try again.",
      parsed.error.issues
    )
  }

  const closedCardIds = new Set(
    snapshot.cards.filter((c) => c.isClosed).map((c) => c.id)
  )
  const changes: ProposalBatch["changes"] = []

  for (const change of parsed.data.changes) {
    if (change.change_type === "create") {
      changes.push({
        changeType: "create",
        card: {
          title: change.card.title,
          description: change.card.description,
          acceptanceCriteria: change.card.acceptanceCriteria,
          status: change.card.status,
          priority: change.card.priority,
          epicName: change.card.epic_name,
          customFields: change.card.custom_fields,
        },
        relationSummary: change.relation_summary.map((r) => ({
          type: r.type,
          sourceCardId: r.source_card_id,
          targetCardId: r.target_card_id,
          note: r.note,
        })),
        conflictFlags: change.conflict_flags.map((f) => ({
          type: f.type,
          summary: f.summary,
        })),
      })
      continue
    }

    if (change.change_type === "close") {
      changes.push({
        changeType: "close",
        targetCardId: change.target_card_id,
        reason: change.reason,
        relationSummary: change.relation_summary.map((r) => ({
          type: r.type,
          sourceCardId: r.source_card_id,
          targetCardId: r.target_card_id,
          note: r.note,
        })),
        conflictFlags: change.conflict_flags.map((f) => ({
          type: f.type,
          summary: f.summary,
        })),
      })
      continue
    }

    const targetCard = snapshot.cards.find(
      (c) => c.id === change.target_card_id
    )

    if (!targetCard) {
      logger.warn(
        { targetCardId: change.target_card_id },
        "processInstruction: dropping update targeting unknown card"
      )
      continue
    }

    if (closedCardIds.has(targetCard.id)) {
      const fields = change.fields
      const replacement: CreateChange = {
        changeType: "create",
        card: {
          title: fields.title ?? targetCard.title,
          description: fields.description ?? targetCard.description,
          acceptanceCriteria:
            fields.acceptanceCriteria ?? targetCard.acceptanceCriteria,
          status:
            fields.status ??
            (targetCard.status as CreateChange["card"]["status"]),
          priority:
            fields.priority ??
            (targetCard.priority as CreateChange["card"]["priority"]),
          epicName: targetCard.epicName,
          customFields: fields.customFields ?? targetCard.customFields,
        },
        relationSummary: [
          ...change.relation_summary.map((r) => ({
            type: r.type,
            sourceCardId: r.source_card_id,
            targetCardId: r.target_card_id,
            note: r.note,
          })),
          {
            type: "evolution" as const,
            sourceCardId: targetCard.id,
            note: "replaces closed card",
          },
        ],
        conflictFlags: change.conflict_flags.map((f) => ({
          type: f.type,
          summary: f.summary,
        })),
      }
      logger.warn(
        { targetCardId: targetCard.id },
        "processInstruction: converted closed-card update into create+evolution"
      )
      changes.push(replacement)
      continue
    }

    const update: UpdateChange = {
      changeType: "update",
      targetCardId: change.target_card_id,
      fields: {
        title: change.fields.title,
        description: change.fields.description,
        acceptanceCriteria: change.fields.acceptanceCriteria,
        status: change.fields.status,
        priority: change.fields.priority,
        customFields: change.fields.customFields,
      },
      relationSummary: change.relation_summary.map((r) => ({
        type: r.type,
        sourceCardId: r.source_card_id,
        targetCardId: r.target_card_id,
        note: r.note,
      })),
      conflictFlags: change.conflict_flags.map((f) => ({
        type: f.type,
        summary: f.summary,
      })),
    }
    changes.push(update)
  }

  return { changes }
}
