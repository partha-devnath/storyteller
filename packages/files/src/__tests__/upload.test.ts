import { describe, it, expect, vi, beforeEach } from "vitest"

const mockReturning = vi.hoisted(() => vi.fn())
const mockValues = vi.hoisted(() => vi.fn(() => ({ returning: mockReturning })))
const mockInsert = vi.hoisted(() => vi.fn(() => ({ values: mockValues })))

vi.mock("@workspace/db", () => ({
  db: { insert: mockInsert },
}))

vi.mock("@workspace/logger", () => ({
  createLogger: vi.fn(() => ({ info: vi.fn() })),
}))

vi.mock("../utils", () => ({
  generateId: vi.fn(() => "abc123"),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockReturning.mockResolvedValue([])
})

describe("uploadFile", () => {
  it("rejects file exceeding maxSize", async () => {
    const { uploadFile } = await import("../upload")

    await expect(
      uploadFile({
        storage: { save: vi.fn() } as never,
        userId: "user-1",
        file: new File(["x".repeat(100)], "test.txt"),
        maxSize: 50,
      })
    ).rejects.toThrow("exceeds limit")
  })

  it("rejects disallowed mime type", async () => {
    const { uploadFile } = await import("../upload")

    await expect(
      uploadFile({
        storage: { save: vi.fn() } as never,
        userId: "user-1",
        file: new File(["x"], "test.exe", { type: "application/x-msdownload" }),
        allowedMimeTypes: ["image/png", "image/jpeg"],
      })
    ).rejects.toThrow('File type "application/x-msdownload" is not allowed')
  })

  it("rejects unsafe file extension", async () => {
    const { uploadFile } = await import("../upload")

    await expect(
      uploadFile({
        storage: { save: vi.fn() } as never,
        userId: "user-1",
        file: new File(["x"], "test.", { type: "text/html" }),
      })
    ).rejects.toThrow("Unsafe file extension")
  })

  it("accepts valid file and inserts into database", async () => {
    const now = new Date()
    const expectedRecord = {
      id: "abc123",
      userId: "user-1",
      originalName: "test.txt",
      storedName: "abc123.txt",
      mimeType: "text/plain",
      size: 10,
      path: "abc123.txt",
      url: "http://example.com/abc123.txt",
      createdAt: now,
      updatedAt: now,
    }
    mockReturning.mockResolvedValue([expectedRecord])

    const { uploadFile } = await import("../upload")
    const result = await uploadFile({
      storage: {
        save: vi.fn().mockResolvedValue({
          id: "abc123",
          storedName: "abc123.txt",
          path: "abc123.txt",
          url: "http://example.com/abc123.txt",
        }),
      } as never,
      userId: "user-1",
      file: new File(["x"], "test.txt", { type: "text/plain" }),
    })

    expect(result).toEqual({
      id: "abc123",
      originalName: "test.txt",
      mimeType: "text/plain",
      size: 10,
      url: "http://example.com/abc123.txt",
    })
    expect(mockInsert).toHaveBeenCalledOnce()
    expect(mockValues).toHaveBeenCalledOnce()
    expect(mockReturning).toHaveBeenCalledOnce()
  })

  it("uses SAFE_EXT_RE to reject non-alphanumeric extensions", async () => {
    const { uploadFile } = await import("../upload")

    await expect(
      uploadFile({
        storage: { save: vi.fn() } as never,
        userId: "user-1",
        file: new File(["x"], "foo.bar!", { type: "image/png" }),
      })
    ).rejects.toThrow("Unsafe file extension")
  })
})
