import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const mockApiClient = vi.hoisted(() => vi.fn())
vi.mock("@/lib/api-client", () => ({ apiClient: mockApiClient }))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("useChatMessages", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fetches messages for a project", async () => {
    mockApiClient.mockResolvedValue({
      success: true,
      data: [
        {
          id: "m1",
          role: "user",
          kind: "prompt",
          content: "hi",
          projectId: "p1",
          questions: null,
          proposalId: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
    })
    const { useChatMessages } = await import("../use-chat")
    const { result } = renderHook(() => useChatMessages("acme"), { wrapper })
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(mockApiClient).toHaveBeenCalledWith("/api/chat?project=acme")
  })
})

describe("useAddChatMessage", () => {
  beforeEach(() => vi.clearAllMocks())

  it("posts a message and returns the row", async () => {
    mockApiClient.mockResolvedValue({
      success: true,
      data: {
        id: "m2",
        role: "ai",
        kind: "board",
        content: "ok",
        projectId: "p1",
        questions: null,
        proposalId: "prop_1",
        createdAt: "",
        updatedAt: "",
      },
    })
    const { useAddChatMessage } = await import("../use-chat")
    const { result } = renderHook(() => useAddChatMessage("acme"), { wrapper })
    result.current.mutate({
      role: "ai",
      kind: "board",
      content: "ok",
      proposalId: "prop_1",
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockApiClient).toHaveBeenCalledWith(
      "/api/chat?project=acme",
      expect.objectContaining({ method: "POST" })
    )
  })
})
