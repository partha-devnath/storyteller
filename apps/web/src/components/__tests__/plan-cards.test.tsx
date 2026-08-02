import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { PlanCards } from "../plan-cards"
import type { BillingState } from "@workspace/schemas"

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
    portalUrl: null,
  }
}

function renderCards(
  plan: "free" | "pro",
  overrides: { upgradePending?: boolean } = {}
) {
  return render(
    <PlanCards
      billing={billingFor(plan)}
      onUpgrade={vi.fn()}
      onDowngrade={vi.fn()}
      upgradePending={overrides.upgradePending ?? false}
    />
  )
}

describe("PlanCards", () => {
  it("renders both cards with exact plan copy", () => {
    renderCards("free")
    expect(screen.getByTestId("plan-grid")).toBeInTheDocument()
    expect(screen.getByTestId("plan-card-free")).toBeInTheDocument()
    expect(screen.getByTestId("plan-card-pro")).toBeInTheDocument()
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("Pro")).toBeInTheDocument()
    expect(screen.getByText("2 projects")).toBeInTheDocument()
    expect(screen.getByText("5,000 AI actions/mo")).toBeInTheDocument()
  })

  it("free plan: badge on the free card + upgrade CTA, no downgrade CTA", () => {
    renderCards("free")
    const badges = screen.getAllByTestId("current-plan-badge")
    expect(badges).toHaveLength(1)
    expect(
      within(screen.getByTestId("plan-card-free")).getByTestId(
        "current-plan-badge"
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId("plan-select-pro")).toBeInTheDocument()
    expect(screen.queryByTestId("plan-select-free")).not.toBeInTheDocument()
  })

  it("pro plan: badge on the pro card + downgrade CTA, no upgrade CTA", () => {
    renderCards("pro")
    const badges = screen.getAllByTestId("current-plan-badge")
    expect(badges).toHaveLength(1)
    expect(
      within(screen.getByTestId("plan-card-pro")).getByTestId(
        "current-plan-badge"
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId("plan-select-free")).toBeInTheDocument()
    expect(screen.queryByTestId("plan-select-pro")).not.toBeInTheDocument()
  })

  it("upgradePending disables the upgrade CTA and shows Redirecting…", () => {
    renderCards("free", { upgradePending: true })
    const cta = screen.getByTestId("plan-select-pro")
    expect(cta).toBeDisabled()
    expect(cta).toHaveTextContent("Redirecting…")
  })
})
