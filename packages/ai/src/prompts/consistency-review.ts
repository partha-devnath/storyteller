import type { ChatMessage, BoardSnapshot, SemanticMatch } from "../types"

function compactSnapshot(snapshot: BoardSnapshot): string {
  const cards = snapshot.cards
    .map(
      (c) =>
        `${c.slug}|${c.status}|${c.isClosed ? "CLOSED" : "open"}|${c.title}|${c.description}`
    )
    .join("\n")
  const relations = snapshot.relations
    .map((r) => `${r.sourceCardId} ${r.type} ${r.targetCardId}`)
    .join("\n")
  return [`Cards:\n${cards}`, `Relations:\n${relations || "(none)"}`].join("\n")
}

function compactMatches(matches: SemanticMatch[]): string {
  if (matches.length === 0) {
    return "(none)"
  }
  return matches
    .map((m) => `${m.slug}|${m.isClosed ? "CLOSED" : "open"}|${m.title}`)
    .join("\n")
}

export function buildConsistencyReviewPrompt({
  snapshot,
  semanticMatches,
}: {
  snapshot: BoardSnapshot
  semanticMatches: SemanticMatch[]
}): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are Storyteller, reviewing a requirements board for inconsistencies. " +
        "You MUST respond with JSON matching exactly this schema:\n" +
        '{"flags":[{"card_id":string,"type":"contradiction|duplicate|conflict","summary":string}]}\n' +
        "Flag contradictions (two cards describing opposite things), duplicates (two cards describing the same thing), " +
        "and conflicts (a new suggestion clashing with a closed card's frozen definition).\n" +
        "No markdown fences, no prose — only the JSON object.",
    },
    {
      role: "user",
      content:
        `Board snapshot:\n${compactSnapshot(snapshot)}\n\n` +
        `Similar existing cards:\n${compactMatches(semanticMatches)}`,
    },
  ]
}
