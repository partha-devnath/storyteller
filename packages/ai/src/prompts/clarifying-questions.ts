import type {
  ChatMessage,
  BoardSnapshot,
  SemanticMatch,
  ChatHistoryItem,
} from "../types"
import {
  BOARD_JSON_EXAMPLE,
  CLARIFYING_JSON_EXAMPLE,
  JSON_OUTPUT_RULES,
  formatChatHistory,
} from "./json-examples"

export function buildClarifyingQuestionsPrompt({
  question,
  answer,
  priorAnswers,
  prompt,
  snapshot,
  semanticMatches = [],
  chatHistory = [],
}: {
  question: string
  answer: string
  priorAnswers: string
  prompt: string
  snapshot?: BoardSnapshot
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
          .join("\n")}\n\n`
      : ""

  const historyHint = formatChatHistory(chatHistory)

  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that turns natural-language requirements into a living requirements board. " +
        "You are continuing a Q&A conversation with the user to clarify their request. " +
        "You MUST respond with JSON matching exactly this schema. " +
        "Board response example:\n" +
        BOARD_JSON_EXAMPLE +
        "\n\nClarifying response example (use only if you still need clarification):\n" +
        CLARIFYING_JSON_EXAMPLE +
        "\n\n" +
        JSON_OUTPUT_RULES +
        "\n" +
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
        historyHint +
        (historyHint ? "\n" : "") +
        `Previous answers:\n${priorAnswers}\n\n` +
        `Question asked: ${question}\n` +
        `User's answer: ${answer}\n\n` +
        "Generate the board now, or ask further clarifying questions if still ambiguous.",
    },
  ]
}
