import type { LLMProvider, BoardSnapshot, GenerateBoardResult } from "../types"
import { generateBoardOutputSchema } from "../schemas"
import { buildGenerateBoardPrompt } from "../prompts/generate-board"
import { AiOutputError } from "../errors"

export async function generateBoard({
  provider,
  prompt,
  snapshot,
}: {
  provider: LLMProvider
  prompt: string
  snapshot?: BoardSnapshot
}): Promise<GenerateBoardResult> {
  const messages = buildGenerateBoardPrompt({
    prompt,
    existingContext: snapshot ? JSON.stringify(snapshot) : undefined,
  })
  const raw = await provider.chat(messages)
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    throw new AiOutputError(
      "The AI returned malformed board output. Please try again."
    )
  }
  const parsed = generateBoardOutputSchema.safeParse(parsedJson)

  if (!parsed.success) {
    throw new AiOutputError(
      "The AI returned malformed board output. Please try again.",
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
      })),
    })),
  }
}
