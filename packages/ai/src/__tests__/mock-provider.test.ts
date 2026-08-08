import { describe, it, expect, beforeEach, vi } from "vitest"

const originalEnv = process.env

beforeEach(() => {
  vi.resetModules()
})

describe("mock provider", () => {
  it("is the default provider when AI_PROVIDER is unset", async () => {
    process.env = { ...originalEnv, AI_PROVIDER: undefined }
    const { aiProvider, createMockProvider } = await import("../index")
    expect(aiProvider).toBeDefined()
    expect(aiProvider.chat).toBeDefined()
    expect(aiProvider.embed).toBeDefined()
    expect(createMockProvider).toBeDefined()
  })

  it("embeds deterministically into the configured dimension", async () => {
    const { createMockProvider, EMBEDDING_DIMENSIONS } =
      await import("../index")
    const provider = createMockProvider()
    const [v1] = await provider.embed(["loyalty points"])
    expect(v1).toHaveLength(EMBEDDING_DIMENSIONS)
    const [again] = await provider.embed(["loyalty points"])
    expect(again).toEqual(v1)
  })

  it("returns normalized vectors", async () => {
    const { createMockProvider } = await import("../index")
    const provider = createMockProvider()
    const [v] = await provider.embed(["storyteller board"])
    const magnitude = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    expect(magnitude).toBeCloseTo(1, 5)
  })

  it("chat output parses against the generateBoard schema", async () => {
    const { createMockProvider } = await import("../index")
    const { generateBoardOutputSchema } = await import("../schemas")
    const provider = createMockProvider()
    const raw = await provider.chat([
      { role: "user", content: "Build a loyalty program" },
    ])
    const parsed = generateBoardOutputSchema.safeParse(JSON.parse(raw))
    expect(parsed.success).toBe(true)
  })

  it("chat output parses against the processInstruction schema", async () => {
    const { createMockProvider } = await import("../index")
    const { processInstructionOutputSchema } = await import("../schemas")
    const provider = createMockProvider()
    const raw = await provider.chat([
      {
        role: "system",
        content:
          "You MUST respond with JSON... CRITICAL RULE: NEVER update a card whose status is CLOSED.",
      },
      { role: "user", content: "process this: add points accrual" },
    ])
    const parsed = processInstructionOutputSchema.safeParse(JSON.parse(raw))
    expect(parsed.success).toBe(true)
  })

  it("chat returns clarifying questions for short prompts", async () => {
    const { createMockProvider } = await import("../index")
    const provider = createMockProvider()
    const raw = await provider.chat([{ role: "user", content: "hi" }])
    const parsed = JSON.parse(raw)
    expect(parsed.kind).toBe("clarifying")
    expect(parsed.questions.length).toBeGreaterThan(0)
  })

  it("chat returns consistency review for review prompts", async () => {
    const { createMockProvider } = await import("../index")
    const { consistencyReviewOutputSchema } = await import("../schemas")
    const provider = createMockProvider()
    const raw = await provider.chat([
      {
        role: "system",
        content: "reviewing a requirements board for inconsistencies",
      },
      { role: "user", content: "review the board for issues" },
    ])
    const parsed = consistencyReviewOutputSchema.safeParse(JSON.parse(raw))
    expect(parsed.success).toBe(true)
  })
})
