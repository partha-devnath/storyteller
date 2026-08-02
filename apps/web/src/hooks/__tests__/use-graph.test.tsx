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
  return {
    queryClient,
    Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    },
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
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(() => useGraph("demo"), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const keys = queryClient
      .getQueryCache()
      .findAll()
      .map((query) => query.queryKey)
    expect(keys).toContainEqual(["project", "demo", "graph"])
    expect(mockApiClient).toHaveBeenCalledWith("/api/projects/demo/graph")
  })

  it("is disabled when no project slug is provided", async () => {
    const { useGraph } = await import("../use-graph")
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(() => useGraph(undefined), {
      wrapper: Wrapper,
    })

    expect(result.current.fetchStatus).toBe("idle")
    const keys = queryClient
      .getQueryCache()
      .findAll()
      .map((query) => query.queryKey)
    expect(keys).toContainEqual(["project", undefined, "graph"])
    expect(mockApiClient).not.toHaveBeenCalled()
  })
})
