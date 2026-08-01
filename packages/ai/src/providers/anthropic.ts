import type { LLMProvider } from "../types"

export function createAnthropicProvider(): LLMProvider {
  return {
    async chat(): Promise<string> {
      throw new Error(
        "Anthropic provider not implemented — Phase 1 ships the openai + mock providers"
      )
    },

    async embed(): Promise<number[][]> {
      throw new Error(
        "Anthropic provider not implemented — Phase 1 ships the openai + mock providers"
      )
    },
  }
}
