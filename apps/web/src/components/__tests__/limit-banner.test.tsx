import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import type { BillingState } from "@workspace/schemas"

const mockUseBilling = vi.fn()

vi.mock("@/hooks/use-billing", () => ({
  useBilling: (orgId: string | undefined) => mockUseBilling(orgId),
}))

const { LimitBanner } = await import("../limit-banner")

beforeEach(() => {
  vi.clearAllMocks()
})

function overLimitBilling(plan: "free" | "pro" = "free"): BillingState {
  return {
    plan,
    cycle: "monthly",
    price: { free: 0, pro: 12 },
    limits: { projects: 2, members: 5, aiActions: 50, cards: 500 },
    usage: { projects: 2, members: 3, aiActions: 10, cards: 100 },
    checkoutUrl: null,
    portalUrl: null,
  }
}

function underLimitBilling(): BillingState {
  return {
    ...overLimitBilling(),
    usage: { projects: 1, members: 3, aiActions: 10, cards: 100 },
  }
}

function renderBanner(orgId: string | undefined) {
  return render(
    <MemoryRouter>
      <LimitBanner orgId={orgId} />
    </MemoryRouter>
  )
}

describe("LimitBanner", () => {
  it("renders the strip with the first over-limit metric and exact copy", () => {
    mockUseBilling.mockReturnValue({ data: overLimitBilling() })
    renderBanner("org1")
    const banner = screen.getByTestId("limit-banner")
    expect(banner).toHaveAttribute("data-limit-metric", "projects")
    expect(
      screen.getByText("You've reached your free project limit.")
    ).toBeInTheDocument()
    expect(screen.getByTestId("limit-banner-upgrade")).toBeInTheDocument()
  })

  it("renders nothing when all metrics are under their limits", () => {
    mockUseBilling.mockReturnValue({ data: underLimitBilling() })
    renderBanner("org1")
    expect(screen.queryByTestId("limit-banner")).not.toBeInTheDocument()
  })

  it("renders nothing while billing data is loading", () => {
    mockUseBilling.mockReturnValue({ data: undefined })
    renderBanner("org1")
    expect(screen.queryByTestId("limit-banner")).not.toBeInTheDocument()
  })

  it("disappears after dismissal and stays hidden", () => {
    mockUseBilling.mockReturnValue({ data: overLimitBilling() })
    renderBanner("org1")
    expect(screen.getByTestId("limit-banner")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("limit-banner-dismiss"))
    expect(screen.queryByTestId("limit-banner")).not.toBeInTheDocument()
  })
})
