import { describe, it, expect, vi, beforeEach } from "vitest"

const selectChain = vi.hoisted(() => {
  const row: Record<string, unknown> = {}
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(async () => [row]),
  }
  return { builder, row }
})

const insertReturning = vi.hoisted(() => vi.fn(async () => []))
const insertValues = vi.hoisted(() =>
  vi.fn(() => ({ returning: insertReturning }))
)
const deleteReturning = vi.hoisted(() => vi.fn(async () => []))
const deleteWhere = vi.hoisted(() =>
  vi.fn(() => ({ returning: deleteReturning }))
)

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => selectChain.builder),
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  },
}))

vi.mock("@workspace/logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

const fakeCard = {
  id: "card_1",
  title: "Loyalty enrollment flow",
  description: "Users sign up for the loyalty program.",
  acceptanceCriteria: ["User can enroll", "Confirmation shown"],
  priority: "high",
  customFields: { team: "growth" },
}

const { EMBEDDING_DIMENSIONS } = await import("@workspace/ai")

function fakeProvider(embedding?: number[]) {
  const v = embedding ?? Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.5)
  return {
    chat: async () => "",
    embed: async () => [v],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  selectChain.row.id = "card_1"
  selectChain.row.title = fakeCard.title
  selectChain.row.description = fakeCard.description
  selectChain.row.acceptanceCriteria = fakeCard.acceptanceCriteria
  selectChain.row.priority = fakeCard.priority
  selectChain.row.customFields = fakeCard.customFields
  selectChain.row.slug = "loyalty-enroll"
  selectChain.row.isClosed = false
  selectChain.row.similarity = 0.87
  selectChain.row.cardId = "card_1"
  selectChain.row.content = "we discussed points expiry"
  selectChain.row.role = "user"
  selectChain.row.kind = "prompt"
  selectChain.row.createdAt = new Date("2026-08-01T00:00:00Z")
})

describe("embedCard", () => {
  it("builds composite text and calls provider.embed once", async () => {
    const { embedCard } = await import("../index")
    const embedSpy = vi.fn(async () => [
      Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.1),
    ])
    const provider = { chat: async () => "", embed: embedSpy }

    await embedCard({ cardId: "card_1", provider })

    expect(embedSpy).toHaveBeenCalledOnce()
    expect(insertValues).toHaveBeenCalledOnce()
  })

  it("deletes existing rows before inserting", async () => {
    const { embedCard } = await import("../index")
    await embedCard({ cardId: "card_1", provider: fakeProvider() })
    expect(deleteWhere).toHaveBeenCalled()
  })

  it("does not throw on a missing card", async () => {
    selectChain.builder.limit.mockResolvedValueOnce([])
    const { embedCard } = await import("../index")
    await expect(
      embedCard({ cardId: "missing", provider: fakeProvider() })
    ).resolves.toBeUndefined()
    expect(insertValues).not.toHaveBeenCalled()
  })
})

describe("reindexCard", () => {
  it("passes versionId into the inserted row", async () => {
    const { reindexCard } = await import("../index")
    await reindexCard({
      cardId: "card_1",
      provider: fakeProvider(),
      versionId: "ver_1",
    })
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ versionId: "ver_1" })
    )
  })
})

describe("semanticSearch", () => {
  it("embeds the query and scopes by projectId with cosineDistance ordering", async () => {
    const { semanticSearch } = await import("../index")
    const embedSpy = vi.fn(async () => [
      Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.2),
    ])
    const provider = { chat: async () => "", embed: embedSpy }

    const results = await semanticSearch({
      projectId: "proj_1",
      query: "loyalty",
      provider,
      limit: 5,
    })

    expect(embedSpy).toHaveBeenCalledOnce()
    expect(selectChain.builder.where).toHaveBeenCalled()
    expect(selectChain.builder.orderBy).toHaveBeenCalled()
    expect(results[0]).toMatchObject({
      cardId: "card_1",
      slug: "loyalty-enroll",
      isClosed: false,
    })
    expect(typeof results[0].similarity).toBe("number")
  })

  it("returns an empty array when no rows match", async () => {
    selectChain.builder.limit.mockResolvedValueOnce([])
    const { semanticSearch } = await import("../index")
    const results = await semanticSearch({
      projectId: "proj_1",
      query: "nothing",
      provider: fakeProvider(),
    })
    expect(results).toEqual([])
  })
})

describe("embedChatMessage", () => {
  it("embeds the message content and inserts an embedding row", async () => {
    const { embedChatMessage } = await import("../index")
    const embedSpy = vi.fn(async () => [
      Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.3),
    ])
    const provider = { chat: async () => "", embed: embedSpy }

    await embedChatMessage({ messageId: "msg_1", provider })

    expect(embedSpy).toHaveBeenCalledWith(["we discussed points expiry"])
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: "msg_1" })
    )
    expect(deleteWhere).toHaveBeenCalled()
  })

  it("skips messages with empty content", async () => {
    selectChain.row.content = "  "
    const { embedChatMessage } = await import("../index")
    await embedChatMessage({ messageId: "msg_2", provider: fakeProvider() })
    expect(insertValues).not.toHaveBeenCalled()
  })
})

describe("chatHistorySearch", () => {
  it("embeds the query and returns mapped history items", async () => {
    const { chatHistorySearch } = await import("../index")
    const embedSpy = vi.fn(async () => [
      Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0.4),
    ])
    const provider = { chat: async () => "", embed: embedSpy }

    const results = await chatHistorySearch({
      projectId: "proj_1",
      query: "points expiry",
      provider,
      limit: 5,
    })

    expect(embedSpy).toHaveBeenCalledOnce()
    expect(selectChain.builder.where).toHaveBeenCalled()
    expect(results[0]).toMatchObject({
      role: "user",
      kind: "prompt",
      content: "we discussed points expiry",
      similarity: 0.87,
    })
    expect(typeof results[0].createdAt).toBe("string")
  })

  it("returns an empty array when nothing matches", async () => {
    selectChain.builder.limit.mockResolvedValueOnce([])
    const { chatHistorySearch } = await import("../index")
    const results = await chatHistorySearch({
      projectId: "proj_1",
      query: "nothing",
      provider: fakeProvider(),
    })
    expect(results).toEqual([])
  })
})
