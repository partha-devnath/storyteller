import { createNVIDIAProvider } from "./providers/nvidia"
import { createMockProvider } from "./providers/mock"

export { createNVIDIAProvider } from "./providers/nvidia"
export { createMockProvider } from "./providers/mock"
export { AiOutputError } from "./errors"
export type { LLMProvider, ChatMessage } from "./types"
export {
  generateBoardOutputSchema,
  processInstructionOutputSchema,
  consistencyReviewOutputSchema,
  clarifyingAnswersInputSchema,
} from "./schemas"
export { generateBoard } from "./operations/generate-board"
export { answerClarifyingQuestions } from "./operations/clarify"
export { processInstruction } from "./operations/process-instruction"
export { runConsistencyReview } from "./operations/consistency-review"

const providerName = process.env.AI_PROVIDER

export const aiProvider =
  providerName === "nvidia"
    ? createNVIDIAProvider({
        apiKey: process.env.NVIDIA_API_KEY,
        chatModel: process.env.CHAT_MODEL,
        embeddingModel: process.env.EMBEDDING_MODEL,
      })
    : createMockProvider()
