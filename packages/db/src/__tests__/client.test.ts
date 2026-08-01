import { describe, it, expect, vi, beforeEach } from "vitest"

const mockEnd = vi.fn()
const mockPostgres = vi.fn(() => ({ end: mockEnd }))

vi.mock("postgres", () => ({
  default: mockPostgres,
}))

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn(() => ({})),
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DATABASE_URL = "postgres://localhost:5432/test"
})

describe("db client", () => {
  it("creates postgres client with DATABASE_URL and exports db", async () => {
    const mod = await import("../client")
    expect(mockPostgres).toHaveBeenCalledWith(
      "postgres://localhost:5432/test",
      {
        prepare: false,
        max: 10,
        idle_timeout: 30,
        connect_timeout: 10,
      }
    )
    expect(mod.db).toBeDefined()
  })

  it("closeDb calls client.end", async () => {
    const mod = await import("../client")
    await mod.closeDb()
    expect(mockEnd).toHaveBeenCalled()
  })
})
