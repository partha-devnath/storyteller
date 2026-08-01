import { createOpenAIProvider } from "./providers/openai"
import { createAnthropicProvider } from "./providers/anthropic"
import { createMockProvider } from "./providers/mock"

export { createOpenAIProvider } from "./providers/openai"
export { createAnthropicProvider } from "./providers/anthropic"
export { createMockProvider } from "./providers/mock"
export { AiOutputError } from "./errors"
export type { LLMProvider, ChatMessage } from "./types"
export {
  generateBoardOutputSchema,
  processInstructionOutputSchema,
  consistencyReviewOutputSchema,
  clarifyingAnswersInputSchema,
} from "./schemas"

const providerName = process.env.AI_PROVIDER

export const aiProvider =
  providerName === "openai"
    ? createOpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        chatModel: process.env.CHAT_MODEL,
        embeddingModel: process.env.EMBEDDING_MODEL,
      })
    : providerName === "anthropic"
      ? createAnthropicProvider()
      : createMockProvider()
