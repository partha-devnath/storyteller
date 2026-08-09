import type {
  LLMProvider,
  BoardSnapshot,
  SemanticMatch,
  ConflictFlag,
} from "../types"
import { consistencyReviewOutputSchema } from "../schemas"
import { buildConsistencyReviewPrompt } from "../prompts/consistency-review"
import { parseJsonWithRetry } from "./parse-json"

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
  const parsed = await parseJsonWithRetry({
    provider,
    messages,
    schema: consistencyReviewOutputSchema,
    errorMessage:
      "The AI returned a malformed consistency review. Please try again.",
  })

  return {
    flags: parsed.flags.map((f) => ({
      type: f.type,
      summary: f.summary,
    })),
  }
}
