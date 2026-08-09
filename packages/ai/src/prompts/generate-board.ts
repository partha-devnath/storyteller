import type { ChatMessage, CardSectionDef, SemanticMatch } from "../types"

export function buildGenerateBoardPrompt({
  prompt,
  existingContext,
  cardSections = [],
  semanticMatches = [],
}: {
  prompt: string
  existingContext?: string
  cardSections?: CardSectionDef[]
  semanticMatches?: SemanticMatch[]
}): ChatMessage[] {
  const matchesHint =
    semanticMatches.length > 0
      ? `\nExisting cards that may match this request (decide create/update/skip against these):\n${semanticMatches
          .map(
            (m) =>
              `- ${m.title} (id: ${m.cardId}, similarity: ${m.similarity.toFixed(2)}, status: ${m.isClosed ? "closed" : "open"})`
          )
          .join("\n")}`
      : ""

  const sectionsHint =
    cardSections.length > 0
      ? `\nEach story may include these optional sections (as a "sections" object keyed by section name):\n${cardSections
          .map((s) => `- ${s.label}: ${s.description}`)
          .join("\n")}`
      : ""

  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that turns natural-language requirements into a living requirements board. " +
        "You MUST respond with JSON matching exactly this schema:\n" +
        '{"kind":"board","epics":[{"name":string,"description":string,"order":int,' +
        '"stories":[{"title":string,"description":string,"acceptanceCriteria":string[],' +
        '"priority":"low|medium|high|critical","suggestedStatus":"backlog|todo|in_progress|review|done",' +
        '"sections"?:{string:string},' +
        '"action"?:"create|update|skip","targetCardId"?:string,' +
        '"conflictFlags"?:[{type:"contradiction|duplicate|conflict",summary:string}],' +
        '"relationSummary"?:[{type:"dependency|hierarchy|evolution",sourceCardId?:string,targetCardId?:string,note:string}]}]}]}\n' +
        "OR if the request is ambiguous, respond with:\n" +
        '{"kind":"clarifying","questions":[{"question":string,"options":[string]}]}\n' +
        "No markdown fences, no prose — only the JSON object." +
        "Decide per story: create a new card (no existing match), update an existing card " +
        "(matching card needs changes — set action=update, targetCardId, and only the changed fields), " +
        "or skip (matching card already covers the request — set action=skip with a conflictFlags duplicate entry). " +
        "Never create a duplicate of an existing card. " +
        "For updates that replace or depend on other cards, include relationSummary entries." +
        sectionsHint,
    },
    {
      role: "user",
      content: existingContext
        ? `Existing board context:\n${existingContext}\n${matchesHint}\n\nPrompt:\n${prompt}`
        : `${matchesHint}\n\n${prompt}`,
    },
  ]
}
