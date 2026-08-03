import type { LLMProvider, ChatMessage } from "../types"

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

export type NVIDIAProviderEnv = {
  apiKey?: string
  chatModel?: string
  embeddingModel?: string
}

export function createNVIDIAProvider(env: NVIDIAProviderEnv): LLMProvider {
  const apiKey = env.apiKey
  const chatModel = env.chatModel ?? "deepseek-ai/deepseek-v4-flash"
  const embeddingModel = env.embeddingModel ?? "nvidia/nv-embed-v1"

  if (!apiKey) {
    throw new Error(
      'NVIDIA_API_KEY is required when AI_PROVIDER is set to "nvidia"'
    )
  }

  async function loadClient() {
    const { default: OpenAI } = await import("openai")
    return new OpenAI({
      apiKey,
      baseURL: NVIDIA_BASE_URL,
      maxRetries: 4,
      timeout: 120_000,
    })
  }

  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      throw new Error(
        `NVIDIA API request failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      )
    }
  }

  return {
    async chat(messages: ChatMessage[]): Promise<string> {
      const client = await loadClient()
      const completion = await withRetry(() =>
        client.chat.completions.create({
          model: chatModel,
          messages,
        })
      )
      const content = completion.choices[0]?.message?.content
      if (content == null) {
        throw new Error("NVIDIA returned an empty chat completion")
      }
      return content
    },

    async embed(texts: string[]): Promise<number[][]> {
      const client = await loadClient()
      const result = await withRetry(() =>
        client.embeddings.create({
          model: embeddingModel,
          input: texts,
          input_type: "passage",
          truncate: "NONE",
        } as Parameters<typeof client.embeddings.create>[0])
      )
      return result.data.map((entry) => entry.embedding)
    },
  }
}
