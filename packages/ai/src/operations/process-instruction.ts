import type {
  LLMProvider,
  BoardSnapshot,
  SemanticMatch,
  ProposalBatch,
  CreateChange,
  UpdateChange,
  ChatHistoryItem,
} from "../types"
import { processInstructionOutputSchema } from "../schemas"
import { buildProcessInstructionPrompt } from "../prompts/process-instruction"
import { parseJsonWithRetry } from "./parse-json"
import { createLogger } from "@workspace/logger"

const logger = createLogger("ai/process-instruction")

export async function processInstruction({
  provider,
  instruction,
  snapshot,
  semanticMatches,
  chatHistory = [],
}: {
  provider: LLMProvider
  instruction: string
  snapshot: BoardSnapshot
  semanticMatches: SemanticMatch[]
  chatHistory?: ChatHistoryItem[]
}): Promise<ProposalBatch> {
  const messages = buildProcessInstructionPrompt({
    instruction,
    snapshot,
    semanticMatches,
    chatHistory,
  })
  const parsed = await parseJsonWithRetry({
    provider,
    messages,
    schema: processInstructionOutputSchema,
    errorMessage:
      "The AI returned a malformed instruction result. Please try again.",
  })

  const closedCardIds = new Set(
    snapshot.cards.filter((c) => c.isClosed).map((c) => c.id)
  )
  // Resolve card references by raw id OR slug — models may emit either.
  const cardIdByRef = new Map<string, string>()
  for (const card of snapshot.cards) {
    cardIdByRef.set(card.id, card.id)
    cardIdByRef.set(card.slug, card.id)
  }
  const resolveCardRef = (ref: string | undefined): string | undefined =>
    ref ? cardIdByRef.get(ref) : undefined

  const changes: ProposalBatch["changes"] = []

  for (const change of parsed.changes) {
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
        relationSummary: change.relation_summary
          .map((r) => ({
            type: r.type,
            sourceCardId: resolveCardRef(r.source_card_id),
            targetCardId: resolveCardRef(r.target_card_id),
            note: r.note,
          }))
          .filter((r) => Boolean(r.sourceCardId) || Boolean(r.targetCardId)),
        conflictFlags: change.conflict_flags.map((f) => ({
          type: f.type,
          summary: f.summary,
        })),
      })
      continue
    }

    if (change.change_type === "close") {
      const targetId = resolveCardRef(change.target_card_id)
      if (!targetId) {
        logger.warn(
          { targetCardId: change.target_card_id },
          "processInstruction: dropping close targeting unknown card"
        )
        continue
      }
      changes.push({
        changeType: "close",
        targetCardId: targetId,
        reason: change.reason,
        relationSummary: change.relation_summary
          .map((r) => ({
            type: r.type,
            sourceCardId: resolveCardRef(r.source_card_id),
            targetCardId: resolveCardRef(r.target_card_id),
            note: r.note,
          }))
          .filter((r) => Boolean(r.sourceCardId) || Boolean(r.targetCardId)),
        conflictFlags: change.conflict_flags.map((f) => ({
          type: f.type,
          summary: f.summary,
        })),
      })
      continue
    }

    const targetId = resolveCardRef(change.target_card_id)
    const targetCard = snapshot.cards.find((c) => c.id === targetId)

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
          ...change.relation_summary
            .map((r) => ({
              type: r.type,
              sourceCardId: resolveCardRef(r.source_card_id),
              targetCardId: resolveCardRef(r.target_card_id),
              note: r.note,
            }))
            .filter((r) => Boolean(r.sourceCardId) || Boolean(r.targetCardId)),
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
      targetCardId: targetId!,
      fields: {
        title: change.fields.title,
        description: change.fields.description,
        acceptanceCriteria: change.fields.acceptanceCriteria,
        status: change.fields.status,
        priority: change.fields.priority,
        customFields: change.fields.customFields,
      },
      relationSummary: change.relation_summary
        .map((r) => ({
          type: r.type,
          sourceCardId: resolveCardRef(r.source_card_id),
          targetCardId: resolveCardRef(r.target_card_id),
          note: r.note,
        }))
        .filter((r) => Boolean(r.sourceCardId) || Boolean(r.targetCardId)),
      conflictFlags: change.conflict_flags.map((f) => ({
        type: f.type,
        summary: f.summary,
      })),
    }
    changes.push(update)
  }

  return { changes }
}
