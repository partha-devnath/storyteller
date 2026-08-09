import type { ChatMessage, BoardSnapshot, SemanticMatch } from "../types"

export function buildClarifyingQuestionsPrompt({
  question,
  answer,
  priorAnswers,
  prompt,
  snapshot,
  semanticMatches = [],
}: {
  question: string
  answer: string
  priorAnswers: string
  prompt: string
  snapshot?: BoardSnapshot
  semanticMatches?: SemanticMatch[]
}): ChatMessage[] {
  const matchesHint =
    semanticMatches.length > 0
      ? `\nExisting cards that may match this request (decide create/update/skip against these):\n${semanticMatches
          .map(
            (m) =>
              `- ${m.title} (id: ${m.cardId}, similarity: ${m.similarity.toFixed(2)}, status: ${m.isClosed ? "closed" : "open"})`
          )
          .join("\n")}\n\n`
      : ""

  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that turns natural-language requirements into a living requirements board. " +
        "You are continuing a Q&A conversation with the user to clarify their request. " +
        "You MUST respond with JSON matching exactly this schema:\n" +
        '{"kind":"board","epics":[{"name":string,"description":string,"order":int,' +
        '"stories":[{"title":string,"description":string,"acceptanceCriteria":string[],' +
        '"priority":"low|medium|high|critical","suggestedStatus":"backlog|todo|in_progress|review|done",' +
        '"action"?:"create|update|skip","targetCardId"?:string,' +
        '"conflictFlags"?:[{type:"contradiction|duplicate|conflict",summary:string}],' +
        '"relationSummary"?:[{type:"dependency|hierarchy|evolution",sourceCardId?:string,targetCardId?:string,note:string}]}]}]}\n' +
        "OR if you still need clarification, respond with:\n" +
        '{"kind":"clarifying","questions":[{"question":string,"options":[string]}]}\n' +
        "No markdown fences, no prose — only the JSON object." +
        "Decide per story: create a new card (no existing match), update an existing card " +
        "(matching card needs changes — set action=update, targetCardId, and only the changed fields), " +
        "or skip (matching card already covers the request — set action=skip with a conflictFlags duplicate entry). " +
        "Never create a duplicate of an existing card. " +
        "For updates that replace or depend on other cards, include relationSummary entries.",
    },
    {
      role: "user",
      content:
        `Original prompt:\n${prompt}\n\n` +
        (snapshot
          ? `Existing board snapshot:\n${JSON.stringify(snapshot)}\n\n`
          : "") +
        matchesHint +
        `Previous answers:\n${priorAnswers}\n\n` +
        `Question asked: ${question}\n` +
        `User's answer: ${answer}\n\n` +
        "Generate the board now, or ask further clarifying questions if still ambiguous.",
    },
  ]
}
