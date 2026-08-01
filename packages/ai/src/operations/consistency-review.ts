import type {
  LLMProvider,
  BoardSnapshot,
  SemanticMatch,
  ConflictFlag,
} from "../types"
import { consistencyReviewOutputSchema } from "../schemas"
import { buildConsistencyReviewPrompt } from "../prompts/consistency-review"
import { AiOutputError } from "../errors"

export async function runConsistencyReview({
  provider,
  snapshot,
  semanticMatches,
}: {
  provider: LLMProvider
  snapshot: BoardSnapshot
  semanticMatches: SemanticMatch[]
}): Promise<{ flags: ConflictFlag[] }> {
  const messages = buildConsistencyReviewPrompt({
    snapshot,
    semanticMatches,
  })
  const raw = await provider.chat(messages)
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    throw new AiOutputError(
      "The AI returned a malformed consistency review. Please try again."
    )
  }
  const parsed = consistencyReviewOutputSchema.safeParse(parsedJson)

  if (!parsed.success) {
    throw new AiOutputError(
      "The AI returned a malformed consistency review. Please try again.",
      parsed.error.issues
    )
  }

  return {
    flags: parsed.data.flags.map((f) => ({
      type: f.type,
      summary: f.summary,
    })),
  }
}
