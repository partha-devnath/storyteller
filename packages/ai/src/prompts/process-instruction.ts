import type {
  ChatMessage,
  BoardSnapshot,
  SemanticMatch,
  CardSectionDef,
  ChatHistoryItem,
} from "../types"
import { JSON_OUTPUT_RULES, formatChatHistory } from "./json-examples"

function compactSnapshot(snapshot: BoardSnapshot): string {
  const cards = snapshot.cards
    .map(
      (c) =>
        `${c.id}|${c.slug}|${c.status}|${c.isClosed ? "CLOSED" : "open"}|${c.title}`
    )
    .join("\n")
  const epics = snapshot.epics.map((e) => `${e.order}:${e.name}`).join("\n")
  const relations = snapshot.relations
    .map((r) => `${r.sourceCardId} ${r.type} ${r.targetCardId}`)
    .join("\n")
  return [
    `Columns: ${snapshot.columns.join(", ")}`,
    `Epics:\n${epics}`,
    `Cards:\n${cards}`,
    `Relations:\n${relations || "(none)"}`,
  ].join("\n")
}

function compactMatches(matches: SemanticMatch[]): string {
  if (matches.length === 0) {
    return "(none)"
  }
  return matches
    .map(
      (m) =>
        `${m.cardId}|${m.slug}|${m.isClosed ? "CLOSED" : "open"}|${m.similarity.toFixed(2)}|${m.title}`
    )
    .join("\n")
}

const PROCESS_JSON_EXAMPLE =
  '{"changes":[{"change_type":"create","card":{"title":"Loyalty points accrual","description":"Earn points on qualifying purchases.","acceptanceCriteria":["Points accrue on qualifying purchases"],"status":"backlog","priority":"high","epic_name":"Loyalty Program"},"relation_summary":[{"type":"dependency","target_card_id":"loyalty-enroll","note":"Depends on enrollment flow"}],"conflict_flags":[]},{"change_type":"update","target_card_id":"loyalty-rewards-catalog","fields":{"title":"Loyalty rewards catalog (v2)","priority":"high"},"relation_summary":[],"conflict_flags":[]},{"change_type":"close","target_card_id":"loyalty-rewards-catalog-v1","reason":"superseded by v2","relation_summary":[],"conflict_flags":[]}]}'

export function buildProcessInstructionPrompt({
  instruction,
  snapshot,
  semanticMatches,
  cardSections = [],
  chatHistory = [],
}: {
  instruction: string
  snapshot: BoardSnapshot
  semanticMatches: SemanticMatch[]
  cardSections?: CardSectionDef[]
  chatHistory?: ChatHistoryItem[]
}): ChatMessage[] {
  const sectionsHint =
    cardSections.length > 0
      ? `\nNew cards may include these optional sections (as a "sections" object keyed by section name):\n${cardSections
          .map((s) => `- ${s.label}: ${s.description}`)
          .join("\n")}`
      : ""

  const historyHint = formatChatHistory(chatHistory)

  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that maintains a living requirements board from natural-language instructions. " +
        "You MUST respond with JSON matching exactly this schema. " +
        "Response example:\n" +
        PROCESS_JSON_EXAMPLE +
        "\n\n" +
        JSON_OUTPUT_RULES.replace(
          "Optional fields (sections, action, targetCardId, conflictFlags, relationSummary) may be omitted.",
          "Optional fields (epic_name, custom_fields, sections, relation_summary, conflict_flags) may be omitted."
        ) +
        "\n" +
        "CRITICAL RULE: NEVER update a card whose status is CLOSED. " +
        "A closed card is immutable — if the instruction asks to change a closed card, " +
        "emit a NEW create change (same title/description/fields) with an evolution relation " +
        'of {"type":"evolution","source_card_id":"<closed card id>","note":"replaces closed card"}.\n' +
        "Card ids in the snapshot are raw ids (e.g. card_1). " +
        "When a card id is needed (target_card_id, source_card_id, target_card_id), " +
        "use the FIRST field (the id) of the card's snapshot line — never the slug.\n" +
        sectionsHint,
    },
    {
      role: "user",
      content:
        `Current board snapshot:\n${compactSnapshot(snapshot)}\n\n` +
        `Similar existing cards:\n${compactMatches(semanticMatches)}\n` +
        historyHint +
        `\nInstruction:\n${instruction}`,
    },
  ]
}
