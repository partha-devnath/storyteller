import { describe, it, expect, vi } from "vitest"

describe("serveFile", () => {
  it("delegates to storage.serve", async () => {
    const { serveFile } = await import("../serve")
    const mockResponse = new Response("data")
    const storage = { serve: vi.fn().mockResolvedValue(mockResponse) }
    const result = await serveFile(storage as never, "test.png")
    expect(storage.serve).toHaveBeenCalledWith("test.png")
    expect(result).toBe(mockResponse)
  })
})
