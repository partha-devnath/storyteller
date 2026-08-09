import type {
  ChatMessage,
  CardSectionDef,
  SemanticMatch,
  ChatHistoryItem,
} from "../types"

export const BOARD_JSON_EXAMPLE =
  '{"kind":"board","epics":[{"name":"Loyalty Program","description":"Core loyalty enrollment and points accrual.","order":0,"stories":[{"title":"Loyalty enrollment flow","description":"Users sign up for the loyalty program from their account.","acceptanceCriteria":["User can enroll from account settings","Enrollment is confirmed with a success screen"],"priority":"high","suggestedStatus":"todo"}]}]}'

export const CLARIFYING_JSON_EXAMPLE =
  '{"kind":"clarifying","questions":[{"question":"Which user base should the loyalty program target?","options":["All users","New users only","High-value users"]},{"question":"Should points expire after a set period?","options":["Yes","No"]}]}'

export const JSON_OUTPUT_RULES =
  "Respond with ONLY the JSON object matching the schema exactly. " +
  "No markdown fences, no prose, no comments, no trailing text. " +
  "Do not add any keys that are not in the example. " +
  "Optional fields (sections, action, targetCardId, conflictFlags, relationSummary) may be omitted."

export function formatChatHistory(chatHistory: ChatHistoryItem[]): string {
  if (chatHistory.length === 0) return ""
  const lines = chatHistory.map(
    (h) => `- [${h.role}] ${h.content.replace(/\n/g, " ").slice(0, 500)}`
  )
  return `\nRelevant earlier discussion from this project's chat history (most relevant first):\n${lines.join("\n")}`
}

export function buildGenerateBoardPrompt({
  prompt,
  existingContext,
  cardSections = [],
  semanticMatches = [],
  chatHistory = [],
}: {
  prompt: string
  existingContext?: string
  cardSections?: CardSectionDef[]
  semanticMatches?: SemanticMatch[]
  chatHistory?: ChatHistoryItem[]
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

  const historyHint = formatChatHistory(chatHistory)

  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that turns natural-language requirements into a living requirements board. " +
        "You MUST respond with JSON matching exactly this schema. " +
        "Board response example:\n" +
        BOARD_JSON_EXAMPLE +
        "\n\nClarifying response example (use only when the request is ambiguous and needs more input):\n" +
        CLARIFYING_JSON_EXAMPLE +
        "\n\n" +
        JSON_OUTPUT_RULES +
        "\n" +
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
        ? `Existing board context:\n${existingContext}\n${matchesHint}${historyHint}\n\nPrompt:\n${prompt}`
        : `${matchesHint}${historyHint}\n\n${prompt}`,
    },
  ]
}
