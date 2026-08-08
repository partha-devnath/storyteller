import type {
  ChatMessage,
  BoardSnapshot,
  SemanticMatch,
  CardSectionDef,
} from "../types"

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

export function buildProcessInstructionPrompt({
  instruction,
  snapshot,
  semanticMatches,
  cardSections = [],
}: {
  instruction: string
  snapshot: BoardSnapshot
  semanticMatches: SemanticMatch[]
  cardSections?: CardSectionDef[]
}): ChatMessage[] {
  const sectionsHint =
    cardSections.length > 0
      ? `\nNew cards may include these optional sections (as a "sections" object keyed by section name):\n${cardSections
          .map((s) => `- ${s.label}: ${s.description}`)
          .join("\n")}`
      : ""

  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that maintains a living requirements board from natural-language instructions. " +
        "You MUST respond with JSON matching exactly this schema:\n" +
        '{"changes":[{"change_type":"create","card":{"title":string,"description":string,' +
        '"acceptanceCriteria":string[],"status":"backlog|todo|in_progress|review|done",' +
        '"priority":"low|medium|high|critical","epic_name"?:string,"custom_fields"?:Record<string,string>,' +
        '"sections"?:{string:string}},' +
        '"relation_summary":[{"type":"dependency|hierarchy|evolution","source_card_id"?:string,' +
        '"target_card_id"?:string,"note":string}],"conflict_flags":[{"type":"contradiction|duplicate|conflict","summary":string}]}' +
        '|{"change_type":"update","target_card_id":string,"fields":{...},' +
        '"relation_summary":[...],"conflict_flags":[...]}' +
        '|{"change_type":"close","target_card_id":string,"reason":string,' +
        '"relation_summary":[...],"conflict_flags":[...]}]}\n' +
        "CRITICAL RULE: NEVER update a card whose status is CLOSED. " +
        "A closed card is immutable — if the instruction asks to change a closed card, " +
        "emit a NEW create change (same title/description/fields) with an evolution relation " +
        'of {"type":"evolution","source_card_id":"<closed card id>","note":"replaces closed card"}.\n' +
        "Card ids in the snapshot are raw ids (e.g. card_1). " +
        "When a card id is needed (target_card_id, source_card_id, target_card_id), " +
        "use the FIRST field (the id) of the card's snapshot line — never the slug.\n" +
        "No markdown fences, no prose — only the JSON object." +
        sectionsHint,
    },
    {
      role: "user",
      content:
        `Current board snapshot:\n${compactSnapshot(snapshot)}\n\n` +
        `Similar existing cards:\n${compactMatches(semanticMatches)}\n\n` +
        `Instruction:\n${instruction}`,
    },
  ]
}
