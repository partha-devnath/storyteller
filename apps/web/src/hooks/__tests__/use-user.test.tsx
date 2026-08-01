import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode } from "react"

const mockApiClient = vi.fn()

vi.mock("@/lib/api-client", () => ({
  apiClient: mockApiClient,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe("useUser", () => {
  it("returns user data on success", async () => {
    const userData = {
      success: true,
      data: { user: { id: "1", name: "Test", email: "test@test.com" } },
    }
    mockApiClient.mockResolvedValue(userData)

    const { useUser } = await import("../use-user")
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(userData)
    expect(mockApiClient).toHaveBeenCalledWith("/api/protected")
  })

  it("does not retry on failure", async () => {
    mockApiClient.mockRejectedValue(new Error("unauthorized"))

    const { useUser } = await import("../use-user")
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockApiClient).toHaveBeenCalledTimes(1)
  })
})
