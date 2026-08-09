import type {
  LLMProvider,
  BoardSnapshot,
  GenerateBoardResult,
  CardSectionDef,
  SemanticMatch,
  ChatHistoryItem,
} from "../types"
import { generateBoardOutputSchema } from "../schemas"
import { buildGenerateBoardPrompt } from "../prompts/generate-board"
import { parseJsonWithRetry } from "./parse-json"

export async function generateBoard({
  provider,
  prompt,
  snapshot,
  cardSections = [],
  semanticMatches = [],
  chatHistory = [],
}: {
  provider: LLMProvider
  prompt: string
  snapshot?: BoardSnapshot
  cardSections?: CardSectionDef[]
  semanticMatches?: SemanticMatch[]
  chatHistory?: ChatHistoryItem[]
}): Promise<GenerateBoardResult> {
  const messages = buildGenerateBoardPrompt({
    prompt,
    existingContext: snapshot ? JSON.stringify(snapshot) : undefined,
    cardSections,
    semanticMatches,
    chatHistory,
  })
  const parsed = await parseJsonWithRetry({
    provider,
    messages,
    schema: generateBoardOutputSchema,
    errorMessage: "The AI returned malformed board output. Please try again.",
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
