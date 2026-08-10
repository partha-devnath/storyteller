import { describe, it, expect, beforeEach, vi } from "vitest"

const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
})

describe("nvidia provider", () => {
  it("throws when NVIDIA_API_KEY is missing", async () => {
    const { createNVIDIAProvider } = await import("../index")
    expect(() => createNVIDIAProvider({ apiKey: undefined })).toThrowError(
      /NVIDIA_API_KEY is required/
    )
  })

  it("exposes chat and embed methods", async () => {
    const { createNVIDIAProvider } = await import("../index")
    const provider = createNVIDIAProvider({ apiKey: "nvapi-test" })
    expect(provider.chat).toBeDefined()
    expect(provider.embed).toBeDefined()
  })

  it("selects the nvidia provider when AI_PROVIDER=nvidia", async () => {
    process.env = {
      ...originalEnv,
      AI_PROVIDER: "nvidia",
      NVIDIA_API_KEY: "nvapi-test",
    }
    const { aiProvider } = await import("../index")
    expect(aiProvider).toBeDefined()
    expect(aiProvider.chat).toBeDefined()
    expect(aiProvider.embed).toBeDefined()
  })
})

describe("truncateEmbedText", () => {
  it("passes short text through unchanged", async () => {
    const { truncateEmbedText } = await import("../providers/nvidia")
    expect(truncateEmbedText("short")).toBe("short")
  })

  it("truncates text over the token budget", async () => {
    const { truncateEmbedText, EMBED_MAX_CHARS } =
      await import("../providers/nvidia")
    const long = "a".repeat(EMBED_MAX_CHARS + 500)
    const out = truncateEmbedText(long)
    expect(out.length).toBe(EMBED_MAX_CHARS)
    expect(out.endsWith("a")).toBe(true)
  })
})
