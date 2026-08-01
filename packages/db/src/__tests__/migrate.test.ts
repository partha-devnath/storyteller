import { describe, it, expect, vi, beforeEach } from "vitest"

const mockMigrate = vi.fn()
const mockEnd = vi.fn()
const mockPostgres = vi.fn(() => ({ end: mockEnd }))
const mockDrizzle = vi.fn()
const mockExistsSync = vi.fn()

vi.mock("node:fs", () => ({
  default: { existsSync: mockExistsSync },
  existsSync: mockExistsSync,
}))

vi.mock("postgres", () => ({
  default: mockPostgres,
}))

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: mockDrizzle,
}))

vi.mock("drizzle-orm/postgres-js/migrator", () => ({
  migrate: mockMigrate,
}))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.DATABASE_URL
})

describe("runMigrations", () => {
  it("exits when DATABASE_URL is missing", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { runMigrations } = await import("../migrate")
    await runMigrations()

    expect(errorSpy).toHaveBeenCalledWith(
      "DATABASE_URL environment variable is required"
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("skips when migrations folder does not exist", async () => {
    mockExistsSync.mockReturnValue(false)
    process.env.DATABASE_URL = "postgres://localhost:5432/test"

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { runMigrations } = await import("../migrate")
    await runMigrations()

    expect(logSpy).toHaveBeenCalledWith(
      "No migrations folder found, skipping migrations"
    )
    logSpy.mockRestore()
  })

  it("runs migrations successfully", async () => {
    mockExistsSync.mockReturnValue(true)
    process.env.DATABASE_URL = "postgres://localhost:5432/test"
    mockMigrate.mockResolvedValue(undefined)

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { runMigrations } = await import("../migrate")
    await runMigrations()

    expect(mockPostgres).toHaveBeenCalledWith(
      "postgres://localhost:5432/test",
      { max: 1 }
    )
    expect(mockDrizzle).toHaveBeenCalled()
    expect(mockMigrate).toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith("Migrations completed successfully")
    expect(mockEnd).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  it("exits when migration fails", async () => {
    mockExistsSync.mockReturnValue(true)
    process.env.DATABASE_URL = "postgres://localhost:5432/test"
    mockMigrate.mockRejectedValue(new Error("migration error"))

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { runMigrations } = await import("../migrate")
    await runMigrations()

    expect(errorSpy).toHaveBeenCalledWith(
      "Migration failed:",
      expect.any(Error)
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(mockEnd).toHaveBeenCalled()
    exitSpy.mockRestore()
    errorSpy.mockRestore()
  })
})
