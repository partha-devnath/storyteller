import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode } from "react"
import type { BillingState } from "@workspace/schemas"

const mockFetch = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", mockFetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
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

const freeBilling: BillingState = {
  plan: "free",
  cycle: "monthly",
  price: { free: 0, pro: 12 },
  limits: { projects: 2, members: 5, aiActions: 50, cards: 500 },
  usage: { projects: 2, members: 3, aiActions: 10, cards: 100 },
  checkoutUrl: null,
  portalUrl: null,
}

describe("useBilling", () => {
  it("returns the fetched BillingState data with query key ['billing', orgId]", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: freeBilling })
    )

    const { useBilling } = await import("../use-billing")
    const { queryClient, Wrapper } = createWrapper()
    const { result } = renderHook(() => useBilling("org1"), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(freeBilling)
    const keys = queryClient
      .getQueryCache()
      .findAll()
      .map((query) => query.queryKey)
    expect(keys).toContainEqual(["billing", "org1"])
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/orgs/org1/billing"),
      expect.anything()
    )
  })
})

describe("useUsage", () => {
  it("reports at-limit when usage equals the limit, pct clamps at 100", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: freeBilling })
    )

    const { useUsage } = await import("../use-billing")
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUsage("org1"), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.plan).toBe("free"))
    expect(result.current.isAtLimit("projects")).toBe(true)
    expect(result.current.isAtLimit("members")).toBe(false)
    expect(result.current.pct("projects")).toBe(100)
    expect(result.current.pct("members")).toBe(60)
  })

  it("clamps pct above 100 and treats null limits as unlimited", async () => {
    const over: BillingState = {
      ...freeBilling,
      limits: { projects: 2, members: null, aiActions: 50, cards: 500 },
      usage: { projects: 5, members: 4, aiActions: 10, cards: 100 },
    }
    mockFetch.mockResolvedValue(jsonResponse({ success: true, data: over }))

    const { useUsage } = await import("../use-billing")
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUsage("org1"), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.plan).toBe("free"))
    expect(result.current.pct("projects")).toBe(100)
    expect(result.current.isAtLimit("members")).toBe(false)
    expect(result.current.pct("members")).toBe(100)
  })
})

describe("useCheckout", () => {
  it("redirects to the returned checkout url on success", async () => {
    const location = { href: "" }
    vi.stubGlobal("location", location)
    mockFetch.mockResolvedValue(
      jsonResponse({
        success: true,
        data: { url: "https://checkout.stripe.com/test-session" },
      })
    )

    const { useCheckout } = await import("../use-billing")
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCheckout("org1"), {
      wrapper: Wrapper,
    })

    result.current.mutate()
    await waitFor(() =>
      expect(location.href).toBe("https://checkout.stripe.com/test-session")
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/orgs/org1/billing/checkout"),
      expect.objectContaining({ method: "POST" })
    )
  })
})
