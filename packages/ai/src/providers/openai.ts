import type { LLMProvider, ChatMessage } from "../types"

export type OpenAIProviderEnv = {
  apiKey?: string
  chatModel?: string
  embeddingModel?: string
}

export function createOpenAIProvider(env: OpenAIProviderEnv): LLMProvider {
  const apiKey = env.apiKey
  const chatModel = env.chatModel ?? "gpt-4o-mini"
  const embeddingModel = env.embeddingModel ?? "text-embedding-3-small"

  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is required when AI_PROVIDER is set to "openai"'
    )
  }

  async function loadClient() {
    const { default: OpenAI } = await import("openai")
    return new OpenAI({ apiKey })
  }

  return {
    async chat(messages: ChatMessage[]): Promise<string> {
      const client = await loadClient()
      const completion = await client.chat.completions.create({
        model: chatModel,
        messages,
      })
      const content = completion.choices[0]?.message?.content
      if (content == null) {
        throw new Error("OpenAI returned an empty chat completion")
      }
      return content
    },

    async embed(texts: string[]): Promise<number[][]> {
      const client = await loadClient()
      const result = await client.embeddings.create({
        model: embeddingModel,
        input: texts,
      })
      return result.data.map((entry) => entry.embedding)
    },
  }
}
