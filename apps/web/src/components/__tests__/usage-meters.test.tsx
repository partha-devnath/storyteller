import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { UsageMeters } from "../usage-meters"
import type { PlanLimits } from "@workspace/schemas"

const FREE_LIMITS: PlanLimits = {
  projects: 2,
  members: 5,
  aiActions: 50,
  cards: 500,
}

describe("UsageMeters", () => {
  it("renders one meter per metric with raw data-pct and no warnings under 80%", () => {
    render(
      <UsageMeters
        usage={{ projects: 1, members: 2, aiActions: 39, cards: 100 }}
        limits={FREE_LIMITS}
        plan="free"
      />
    )

    expect(screen.getByTestId("usage-section")).toBeInTheDocument()
    for (const metric of ["projects", "members", "aiActions", "cards"]) {
      expect(screen.getByTestId(`usage-meter-${metric}`)).toBeInTheDocument()
      expect(screen.getByTestId(`usage-value-${metric}`)).toBeInTheDocument()
    }

    expect(screen.getByTestId("usage-bar-projects")).toHaveAttribute(
      "data-pct",
      "50"
    )
    expect(screen.getByTestId("usage-bar-members")).toHaveAttribute(
      "data-pct",
      "40"
    )
    expect(screen.getByTestId("usage-bar-aiActions")).toHaveAttribute(
      "data-pct",
      "78"
    )
    expect(screen.getByTestId("usage-bar-cards")).toHaveAttribute(
      "data-pct",
      "20"
    )

    // all under 80 → primary fill
    for (const metric of ["projects", "members", "aiActions", "cards"]) {
      expect(screen.getByTestId(`usage-bar-${metric}`)).toHaveClass(
        "bg-primary"
      )
    }

    expect(screen.queryByText(/nearly exhausted/)).not.toBeInTheDocument()
    expect(
      screen.queryByText("Limit reached — upgrade to Pro to continue.")
    ).not.toBeInTheDocument()
  })

  it("renders raw fractional data-pct (99.8) at 499/500", () => {
    render(
      <UsageMeters
        usage={{ projects: 1, members: 2, aiActions: 39, cards: 499 }}
        limits={FREE_LIMITS}
        plan="free"
      />
    )
    expect(screen.getByTestId("usage-bar-cards")).toHaveAttribute(
      "data-pct",
      "99.8"
    )
    expect(
      screen.getByText("Cards nearly exhausted — upgrade for more headroom.")
    ).toBeInTheDocument()
    // 99.8 is >= 80 → warn fill, not primary
    expect(screen.getByTestId("usage-bar-cards")).toHaveClass("bg-warn")
  })

  it("switches to warn fill + warning at exactly 80%", () => {
    render(
      <UsageMeters
        usage={{ projects: 1, members: 2, aiActions: 40, cards: 100 }}
        limits={FREE_LIMITS}
        plan="free"
      />
    )
    expect(screen.getByTestId("usage-bar-aiActions")).toHaveAttribute(
      "data-pct",
      "80"
    )
    expect(screen.getByTestId("usage-bar-aiActions")).toHaveClass("bg-warn")
    expect(
      screen.getByText(
        "AI actions nearly exhausted — upgrade for more headroom."
      )
    ).toBeInTheDocument()
    // "Resets monthly" caption only on the AI actions row
    expect(screen.getByText("Resets monthly")).toBeInTheDocument()
  })

  it("switches to destructive fill + limit copy at 100%", () => {
    render(
      <UsageMeters
        usage={{ projects: 2, members: 2, aiActions: 39, cards: 100 }}
        limits={FREE_LIMITS}
        plan="free"
      />
    )
    expect(screen.getByTestId("usage-bar-projects")).toHaveAttribute(
      "data-pct",
      "100"
    )
    expect(screen.getByTestId("usage-bar-projects")).toHaveClass(
      "bg-destructive"
    )
    expect(screen.getByTestId("usage-value-projects")).toHaveClass(
      "text-destructive"
    )
    expect(
      screen.getByText("Limit reached — upgrade to Pro to continue.")
    ).toBeInTheDocument()
  })

  it("renders Unlimited with a 0-width fill and no warnings for null limits", () => {
    render(
      <UsageMeters
        usage={{ projects: 3, members: 4, aiActions: 60, cards: 700 }}
        limits={{ projects: null, members: null, aiActions: null, cards: null }}
        plan="pro"
      />
    )
    expect(screen.getAllByText("Unlimited")).toHaveLength(4)
    for (const metric of ["projects", "members", "aiActions", "cards"]) {
      const bar = screen.getByTestId(`usage-bar-${metric}`)
      expect(bar).toHaveAttribute("data-pct", "0")
      expect(bar).toHaveStyle({ width: "0%" })
    }
    expect(screen.queryByText(/nearly exhausted/)).not.toBeInTheDocument()
    expect(
      screen.queryByText("Limit reached — upgrade to Pro to continue.")
    ).not.toBeInTheDocument()
  })
})
