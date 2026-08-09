import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import {
  extractJson,
  normalizeJsonOutput,
  parseJsonWithRetry,
} from "../operations/parse-json"
import { generateBoardOutputSchema } from "../schemas"
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

describe("normalizeJsonOutput", () => {
  it("converts none-like strings on array fields to empty arrays", () => {
    const out = normalizeJsonOutput({
      kind: "board",
      epics: [
        {
          stories: [
            { relationSummary: "none", conflictFlags: "N/A" },
            { relationSummary: "", conflictFlags: "no" },
          ],
        },
      ],
    })
    const stories = (out as { epics: { stories: unknown[] }[] }).epics[0]
      .stories as Record<string, unknown>[]
    expect(stories[0].relationSummary).toEqual([])
    expect(stories[0].conflictFlags).toEqual([])
    expect(stories[1].relationSummary).toEqual([])
    expect(stories[1].conflictFlags).toEqual([])
  })

  it("handles snake_case keys for the instruction schema", () => {
    const out = normalizeJsonOutput({
      changes: [
        {
          change_type: "update",
          relation_summary: "none",
          conflict_flags: "none",
        },
      ],
    })
    const change = (out as { changes: Record<string, unknown>[] }).changes[0]
    expect(change.relation_summary).toEqual([])
    expect(change.conflict_flags).toEqual([])
  })

  it("leaves real array values and prose untouched", () => {
    const out = normalizeJsonOutput({
      epics: [
        {
          stories: [
            {
              title: "none at all",
              relationSummary: [{ type: "dependency", note: "none" }],
              acceptanceCriteria: ["none"],
            },
          ],
        },
      ],
    })
    expect(out).toEqual({
      epics: [
        {
          stories: [
            {
              title: "none at all",
              relationSummary: [{ type: "dependency", note: "none" }],
              acceptanceCriteria: ["none"],
            },
          ],
        },
      ],
    })
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

  it("accepts none-like strings on array fields without a retry", async () => {
    const noneOutput = JSON.stringify({
      kind: "board",
      epics: [
        {
          name: "Loyalty",
          description: "Loyalty program.",
          order: 0,
          stories: [
            {
              title: "Enroll",
              description: "d",
              acceptanceCriteria: [],
              priority: "medium",
              suggestedStatus: "backlog",
              action: "update",
              targetCardId: "card_1",
              conflictFlags: "none",
              relationSummary: "none",
            },
          ],
        },
      ],
    })
    const chat = vi.fn(async () => noneOutput)
    const provider = { chat, embed: async () => [] } as unknown as LLMProvider
    const result = await parseJsonWithRetry({
      provider,
      messages: [{ role: "user", content: "build" }],
      schema: generateBoardOutputSchema,
      errorMessage: "malformed",
    })
    expect(result.kind).toBe("board")
    if (result.kind === "board") {
      expect(result.epics[0].stories[0].relationSummary).toEqual([])
      expect(result.epics[0].stories[0].conflictFlags).toEqual([])
    }
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
