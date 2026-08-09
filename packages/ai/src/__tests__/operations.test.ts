import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMockProvider } from "../providers/mock"
import type { BoardSnapshot } from "../types"
import { AiOutputError } from "../errors"

vi.mock("@workspace/logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const snapshot: BoardSnapshot = {
  projectId: "proj_1",
  projectSlug: "loyalty",
  columns: ["backlog", "todo", "in_progress", "review", "done"],
  epics: [
    { id: "epic_1", name: "Loyalty Program", order: 0 },
    { id: "epic_2", name: "Rewards Catalog", order: 1 },
  ],
  cards: [
    {
      id: "loyalty-enroll",
      title: "Loyalty enrollment flow",
      description: "Users enroll.",
      acceptanceCriteria: ["Enrolls"],
      status: "todo",
      priority: "high",
      isClosed: true,
      slug: "loyalty-enroll",
    },
    {
      id: "loyalty-rewards-catalog",
      title: "Loyalty rewards catalog",
      description: "Browse rewards.",
      acceptanceCriteria: ["Browse"],
      status: "backlog",
      priority: "medium",
      isClosed: false,
      slug: "loyalty-rewards-catalog",
    },
  ],
  relations: [],
}

describe("generateBoard operation", () => {
  it("produces epics with stable slugs from the mock", async () => {
    const { generateBoard } = await import("../operations/generate-board")
    const provider = createMockProvider()
    const result = await generateBoard({
      provider,
      prompt: "Build a loyalty program",
    })
    expect(result.kind).toBe("board")
    if (result.kind === "board") {
      expect(result.epics).toHaveLength(2)
      const stories = result.epics.flatMap((e) => e.stories)
      expect(stories.map((s) => s.title)).toContain("Loyalty enrollment flow")
      expect(stories.map((s) => s.title)).toContain("Loyalty points accrual")
      expect(stories.map((s) => s.title)).toContain("Loyalty rewards catalog")
    }
  })

  it("returns clarifying kind for ambiguous input", async () => {
    const { generateBoard } = await import("../operations/generate-board")
    const provider = createMockProvider()
    const result = await generateBoard({ provider, prompt: "hi" })
    expect(result.kind).toBe("clarifying")
  })

  it("throws AiOutputError on malformed provider output", async () => {
    const { generateBoard } = await import("../operations/generate-board")
    const badProvider = {
      async chat() {
        return "not json"
      },
      async embed() {
        return []
      },
    }
    await expect(
      generateBoard({ provider: badProvider, prompt: "x" })
    ).rejects.toThrow(AiOutputError)
  })

  it("retries once when clarifying questions come back empty", async () => {
    const { generateBoard } = await import("../operations/generate-board")
    const chat = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({ kind: "clarifying", questions: [] })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          kind: "board",
          epics: [
            {
              name: "Loyalty",
              description: "d",
              order: 0,
              stories: [
                {
                  title: "Enroll",
                  description: "d",
                  acceptanceCriteria: [],
                  priority: "medium",
                  suggestedStatus: "backlog",
                },
              ],
            },
          ],
        })
      )
    const provider = { chat, embed: async () => [] }
    const result = await generateBoard({ provider, prompt: "Build loyalty" })
    expect(chat).toHaveBeenCalledTimes(2)
    expect(result.kind).toBe("board")
  })

  it("throws AiOutputError when clarifying stays empty after retry", async () => {
    const { generateBoard } = await import("../operations/generate-board")
    const chat = vi
      .fn()
      .mockResolvedValueOnce(
        JSON.stringify({ kind: "clarifying", questions: [] })
      )
      .mockResolvedValueOnce(
        JSON.stringify({ kind: "clarifying", questions: [] })
      )
    const provider = { chat, embed: async () => [] }
    await expect(
      generateBoard({ provider, prompt: "Build loyalty" })
    ).rejects.toThrow(AiOutputError)
    expect(chat).toHaveBeenCalledTimes(2)
  })
})

describe("processInstruction operation", () => {
  it("returns a proposal batch from the mock", async () => {
    const { processInstruction } =
      await import("../operations/process-instruction")
    const provider = createMockProvider()
    const result = await processInstruction({
      provider,
      instruction: "process: add points accrual",
      snapshot,
      semanticMatches: [],
    })
    expect(result.changes.length).toBeGreaterThan(0)
  })

  it("converts a closed-card update into a create+evolution change", async () => {
    const { processInstruction } =
      await import("../operations/process-instruction")
    const provider = createMockProvider()

    const closedTargetSnapshot: BoardSnapshot = {
      ...snapshot,
      cards: snapshot.cards.map((c) =>
        c.id === "loyalty-rewards-catalog" ? { ...c, isClosed: true } : c
      ),
    }

    const result = await processInstruction({
      provider,
      instruction: "process: add points accrual",
      snapshot: closedTargetSnapshot,
      semanticMatches: [],
    })

    const updatedClosed = result.changes.find(
      (c) =>
        c.changeType === "update" &&
        c.targetCardId === "loyalty-rewards-catalog"
    )
    expect(updatedClosed).toBeUndefined()

    const evolutionCreate = result.changes.find(
      (c) =>
        c.changeType === "create" &&
        c.relationSummary.some(
          (r) =>
            r.type === "evolution" &&
            r.sourceCardId === "loyalty-rewards-catalog"
        )
    )
    expect(evolutionCreate).toBeDefined()
  })

  it("drops updates targeting unknown cards", async () => {
    const { processInstruction } =
      await import("../operations/process-instruction")
    const unknownTargetProvider = {
      async chat() {
        return JSON.stringify({
          changes: [
            {
              change_type: "update",
              target_card_id: "card_999",
              fields: { title: "ghost" },
              relation_summary: [],
              conflict_flags: [],
            },
          ],
        })
      },
      async embed() {
        return []
      },
    }
    const result = await processInstruction({
      provider: unknownTargetProvider,
      instruction: "process: change a card that does not exist",
      snapshot,
      semanticMatches: [],
    })
    expect(result.changes).toHaveLength(0)
  })

  it("resolves slug-referenced targets and relation endpoints to ids", async () => {
    const { processInstruction } =
      await import("../operations/process-instruction")
    const slugRefProvider = {
      async chat() {
        return JSON.stringify({
          changes: [
            {
              change_type: "update",
              target_card_id: "loyalty-rewards-catalog",
              fields: { title: "Catalog v2" },
              relation_summary: [
                {
                  type: "dependency",
                  source_card_id: "loyalty-enroll",
                  note: "links to enrollment",
                },
              ],
              conflict_flags: [],
            },
          ],
        })
      },
      async embed() {
        return []
      },
    }
    const result = await processInstruction({
      provider: slugRefProvider,
      instruction: "process: update catalog",
      snapshot,
      semanticMatches: [],
    })
    expect(result.changes).toHaveLength(1)
    const update = result.changes[0]
    expect(update.changeType).toBe("update")
    if (update.changeType === "update") {
      expect(update.targetCardId).toBe("loyalty-rewards-catalog")
      expect(update.relationSummary[0].sourceCardId).toBe("loyalty-enroll")
    }
  })
})

describe("consistency-review operation", () => {
  it("returns flags from the mock", async () => {
    const { runConsistencyReview } =
      await import("../operations/consistency-review")
    const provider = createMockProvider()
    const result = await runConsistencyReview({
      provider,
      snapshot,
      semanticMatches: [],
    })
    expect(Array.isArray(result.flags)).toBe(true)
  })
})
