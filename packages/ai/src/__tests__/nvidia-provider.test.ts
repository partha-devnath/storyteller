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
