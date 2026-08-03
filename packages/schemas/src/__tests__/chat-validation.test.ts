import { describe, it, expect } from "vitest"
import { chatMessageInputSchema } from "../validations/chat"

describe("chatMessageInputSchema", () => {
  it("accepts a minimal user prompt", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "user",
      kind: "prompt",
      content: "hi",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a board reply with a proposalId", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "ai",
      kind: "board",
      content: "Generated 3 cards",
      proposalId: "prop_1",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a clarifying reply with questions", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "ai",
      kind: "clarifying",
      questions: [{ question: "What audience?", options: ["B2B", "B2C"] }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid role", () => {
    const result = chatMessageInputSchema.safeParse({
      role: "bot",
      kind: "prompt",
    })
    expect(result.success).toBe(false)
  })
})
