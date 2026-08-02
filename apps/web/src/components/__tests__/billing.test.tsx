import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import type { BillingState } from "@workspace/schemas"
import type { UsageView } from "@/hooks/use-billing"

const mockUseBilling = vi.fn()
const mockUseCheckout = vi.fn()
const mockUseDowngrade = vi.fn()
const mockUseUsage = vi.fn()

vi.mock("@/hooks/use-billing", () => ({
  useBilling: (orgId: string | undefined) => mockUseBilling(orgId),
  useCheckout: (orgId: string) => mockUseCheckout(orgId),
  useDowngrade: (orgId: string) => mockUseDowngrade(orgId),
  useUsage: (orgId: string | undefined) => mockUseUsage(orgId),
  handleLimitError: () => false,
}))

vi.mock("@/stores/toast-store", () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}))

const { Billing } = await import("../billing")

beforeEach(() => {
  vi.clearAllMocks()
})

function billingFor(plan: "free" | "pro"): BillingState {
  return {
    plan,
    cycle: "monthly",
    price: { free: 0, pro: 12 },
    limits:
      plan === "free"
        ? { projects: 2, members: 5, aiActions: 50, cards: 500 }
        : { projects: null, members: 25, aiActions: 5000, cards: null },
    usage: { projects: 1, members: 2, aiActions: 10, cards: 100 },
    checkoutUrl: null,
    portalUrl: plan === "pro" ? "https://billing.stripe.com/portal/test" : null,
  }
}

function usageView(plan: "free" | "pro"): UsageView {
  return {
    usage: { projects: 1, members: 2, aiActions: 10, cards: 100 },
    limits: billingFor(plan).limits,
    plan,
    isAtLimit: () => false,
    pct: () => 50,
  }
}

function renderBilling() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/orgs/org1/billing"]}>
        <Routes>
          <Route path="/orgs/:orgId/billing" element={<Billing />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("Billing page", () => {
  it("free plan: current-plan shows Free, upgrade CTA visible", () => {
    mockUseBilling.mockReturnValue({
      data: billingFor("free"),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    mockUseUsage.mockReturnValue(usageView("free"))
    mockUseCheckout.mockReturnValue({ isPending: false, mutate: vi.fn() })
    mockUseDowngrade.mockReturnValue({ isPending: false, mutate: vi.fn() })

    renderBilling()
    expect(screen.getByText("Billing")).toBeInTheDocument()
    expect(screen.getByTestId("current-plan")).toBeInTheDocument()
    expect(
      within(screen.getByTestId("current-plan")).getByText("Free")
    ).toBeInTheDocument()
    expect(screen.getByText("Billed monthly")).toBeInTheDocument()
    expect(screen.getByTestId("plan-select-pro")).toBeInTheDocument()
    expect(screen.queryByTestId("billing-manage")).not.toBeInTheDocument()
  })

  it("pro plan: billing-manage anchor links to the portal url", () => {
    mockUseBilling.mockReturnValue({
      data: billingFor("pro"),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    mockUseUsage.mockReturnValue(usageView("pro"))
    mockUseCheckout.mockReturnValue({ isPending: false, mutate: vi.fn() })
    mockUseDowngrade.mockReturnValue({ isPending: false, mutate: vi.fn() })

    renderBilling()
    const manage = screen.getByTestId("billing-manage")
    expect(manage).toHaveAttribute(
      "href",
      "https://billing.stripe.com/portal/test"
    )
    expect(screen.queryByTestId("plan-select-pro")).not.toBeInTheDocument()
  })

  it("loading state renders skeleton rows instead of the grid", () => {
    mockUseBilling.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    })

    renderBilling()
    expect(screen.getByTestId("billing-loading")).toBeInTheDocument()
    expect(screen.queryByTestId("plan-grid")).not.toBeInTheDocument()
  })

  it("error state renders the retry banner which refetches", () => {
    const refetch = vi.fn()
    mockUseBilling.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    })

    renderBilling()
    expect(screen.getByText("Couldn't load billing info.")).toBeInTheDocument()
    const retry = screen.getByTestId("billing-retry")
    expect(retry).toBeInTheDocument()
    fireEvent.click(retry)
    expect(refetch).toHaveBeenCalled()
  })
})
