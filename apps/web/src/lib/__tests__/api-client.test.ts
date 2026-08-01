import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("apiClient", () => {
  it("sends GET request and returns JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: "hello" }),
    })

    const { apiClient } = await import("../api-client")
    const result = await apiClient("/test")

    expect(result).toEqual({ success: true, data: "hello" })
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/test",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  it("sends POST with body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    const { apiClient } = await import("../api-client")
    await apiClient("/submit", { method: "POST", body: { name: "test" } })

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/submit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      })
    )
  })

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "bad request" }),
    })

    const { apiClient } = await import("../api-client")
    await expect(apiClient("/fail")).rejects.toThrow("bad request")
  })

  it("throws with fallback message when no error in response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    const { apiClient } = await import("../api-client")
    await expect(apiClient("/fail")).rejects.toThrow(
      "Request failed with status 500"
    )
  })

  it("sends custom headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const { apiClient } = await import("../api-client")
    await apiClient("/test", { headers: { Authorization: "Bearer token" } })

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    )
  })
})
