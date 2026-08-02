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

describe("useGraph", () => {
  it("fetches the graph payload with the project-scoped query key", async () => {
    const payload = {
      success: true,
      data: { nodes: [], edges: [] },
    }
    mockApiClient.mockResolvedValue(payload)

    const { useGraph } = await import("../use-graph")
    const { result } = renderHook(() => useGraph("demo"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.queryKey).toEqual(["project", "demo", "graph"])
    expect(mockApiClient).toHaveBeenCalledWith("/api/projects/demo/graph")
  })

  it("is disabled when no project slug is provided", async () => {
    const { useGraph } = await import("../use-graph")
    const { result } = renderHook(() => useGraph(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockApiClient).not.toHaveBeenCalled()
  })
})
