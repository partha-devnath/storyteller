import type {
  LLMProvider,
  BoardSnapshot,
  GenerateBoardResult,
  SemanticMatch,
} from "../types"
import { generateBoardOutputSchema } from "../schemas"
import { buildClarifyingQuestionsPrompt } from "../prompts/clarifying-questions"
import { AiOutputError } from "../errors"
import { isEmptyClarifying } from "./output-guard"

export async function answerClarifyingQuestions({
  provider,
  prompt,
  question,
  answer,
  priorAnswers,
  snapshot,
  semanticMatches = [],
}: {
  provider: LLMProvider
  prompt: string
  question: string
  answer: string
  priorAnswers: string
  snapshot?: BoardSnapshot
  semanticMatches?: SemanticMatch[]
}): Promise<GenerateBoardResult> {
  const messages = buildClarifyingQuestionsPrompt({
    question,
    answer,
    priorAnswers,
    prompt,
    snapshot,
    semanticMatches,
  })
  const raw = await provider.chat(messages)
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    throw new AiOutputError(
      "The AI returned malformed output while clarifying. Please try again."
    )
  }
  if (isEmptyClarifying(parsedJson)) {
    const retryRaw = await provider.chat(messages)
    try {
      parsedJson = JSON.parse(retryRaw)
    } catch {
      throw new AiOutputError(
        "The AI returned malformed output while clarifying. Please try again."
      )
    }
  }
  const parsed = generateBoardOutputSchema.safeParse(parsedJson)

  if (!parsed.success) {
    throw new AiOutputError(
      "The AI returned malformed output while clarifying. Please try again.",
      parsed.error.issues
    )
  }

  if (parsed.data.kind === "clarifying") {
    return {
      kind: "clarifying",
      questions: parsed.data.questions,
    }
  }

  return {
    kind: "board",
    epics: parsed.data.epics.map((epic) => ({
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
