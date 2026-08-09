import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { extractJson, parseJsonWithRetry } from "../operations/parse-json"
import { AiOutputError } from "../errors"
import type { LLMProvider } from "../types"

const testSchema = z
  .object({
    kind: z.literal("board"),
    epics: z.array(z.object({ name: z.string() })).min(1),
  })
  .strict()

const validBoard = JSON.stringify({
  kind: "board",
  epics: [{ name: "Loyalty" }],
})

describe("extractJson", () => {
  it("passes through plain JSON", () => {
    expect(extractJson(validBoard)).toBe(validBoard)
  })

  it("strips markdown code fences", () => {
    const fenced = "```json\n" + validBoard + "\n```"
    expect(extractJson(fenced)).toBe(validBoard)
  })

  it("extracts JSON from surrounding prose", () => {
    const noisy = "Here is your board:\n" + validBoard + "\n\nLet me know!"
    expect(extractJson(noisy)).toBe(validBoard)
  })

  it("throws when no JSON object is present", () => {
    expect(() => extractJson("not json at all")).toThrow(SyntaxError)
  })
})

describe("parseJsonWithRetry", () => {
  it("returns parsed data on first valid attempt", async () => {
    const chat = vi.fn(async () => validBoard)
    const provider = { chat, embed: async () => [] } as unknown as LLMProvider
    const result = await parseJsonWithRetry({
      provider,
      messages: [{ role: "user", content: "build" }],
      schema: testSchema,
      errorMessage: "malformed",
    })
    expect(result.kind).toBe("board")
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it("retries with validation feedback when schema fails, then succeeds", async () => {
    const bad = JSON.stringify({ kind: "board", epics: [], extra: "key" })
    const chat = vi
      .fn()
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(validBoard)
    const provider = { chat, embed: async () => [] } as unknown as LLMProvider
    const result = await parseJsonWithRetry({
      provider,
      messages: [{ role: "user", content: "build" }],
      schema: testSchema,
      errorMessage: "malformed",
    })
    expect(result.kind).toBe("board")
    expect(chat).toHaveBeenCalledTimes(2)
    const retryMessage = chat.mock.calls[1][0].slice(-1)[0]
    expect(retryMessage.content).toContain("epics")
    expect(retryMessage.content).toContain("extra")
  })

  it("recovers from fenced output", async () => {
    const chat = vi.fn(async () => "```json\n" + validBoard + "\n```")
    const provider = { chat, embed: async () => [] } as unknown as LLMProvider
    const result = await parseJsonWithRetry({
      provider,
      messages: [{ role: "user", content: "build" }],
      schema: testSchema,
      errorMessage: "malformed",
    })
    expect(result.kind).toBe("board")
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it("throws AiOutputError with raw output after retries are exhausted", async () => {
    const chat = vi.fn(async () => "still not json")
    const provider = { chat, embed: async () => [] } as unknown as LLMProvider
    await expect(
      parseJsonWithRetry({
        provider,
        messages: [{ role: "user", content: "build" }],
        schema: testSchema,
        errorMessage: "The AI returned malformed output. Please try again.",
      })
    ).rejects.toMatchObject({
      name: "AiOutputError",
      message: "The AI returned malformed output. Please try again.",
      rawOutput: "still not json",
    })
    expect(chat).toHaveBeenCalledTimes(2)
  })

  it("throws AiOutputError carrying zod issues when schema keeps failing", async () => {
    const bad = JSON.stringify({ kind: "board", epics: [] })
    const chat = vi.fn(async () => bad)
    const provider = { chat, embed: async () => [] } as unknown as LLMProvider
    try {
      await parseJsonWithRetry({
        provider,
        messages: [{ role: "user", content: "build" }],
        schema: testSchema,
        errorMessage: "malformed",
      })
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(AiOutputError)
      const e = error as AiOutputError
      expect(Array.isArray(e.issues)).toBe(true)
      expect(e.rawOutput).toBe(bad)
    }
  })
})
