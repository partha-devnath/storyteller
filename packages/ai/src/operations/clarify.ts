import type {
  LLMProvider,
  BoardSnapshot,
  GenerateBoardResult,
  SemanticMatch,
  ChatHistoryItem,
} from "../types"
import { generateBoardOutputSchema } from "../schemas"
import { buildClarifyingQuestionsPrompt } from "../prompts/clarifying-questions"
import { parseJsonWithRetry } from "./parse-json"

export async function answerClarifyingQuestions({
  provider,
  prompt,
  question,
  answer,
  priorAnswers,
  snapshot,
  semanticMatches = [],
  chatHistory = [],
}: {
  provider: LLMProvider
  prompt: string
  question: string
  answer: string
  priorAnswers: string
  snapshot?: BoardSnapshot
  semanticMatches?: SemanticMatch[]
  chatHistory?: ChatHistoryItem[]
}): Promise<GenerateBoardResult> {
  const messages = buildClarifyingQuestionsPrompt({
    question,
    answer,
    priorAnswers,
    prompt,
    snapshot,
    semanticMatches,
    chatHistory,
  })
  const parsed = await parseJsonWithRetry({
    provider,
    messages,
    schema: generateBoardOutputSchema,
    errorMessage:
      "The AI returned malformed output while clarifying. Please try again.",
  })

  if (parsed.kind === "clarifying") {
    return {
      kind: "clarifying",
      questions: parsed.questions,
    }
  }

  return {
    kind: "board",
    epics: parsed.epics.map((epic) => ({
      name: epic.name,
      description: epic.description,
      order: epic.order,
      stories: epic.stories.map((story) => ({
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        priority: story.priority,
        suggestedStatus: story.suggestedStatus,
        sections: story.sections,
        action: story.action,
        targetCardId: story.targetCardId,
        conflictFlags: story.conflictFlags,
        relationSummary: story.relationSummary,
      })),
    })),
  }
}
