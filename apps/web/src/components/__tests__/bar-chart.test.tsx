import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BarChart } from "../bar-chart"

const points = [
  { date: "2026-08-01", value: 5 },
  { date: "2026-08-02", value: 10 },
  { date: "2026-08-03", value: 0 },
]

describe("BarChart", () => {
  it("renders one rect per point with analytics-bar testids and data-value", () => {
    render(
      <BarChart
        title="Cards created"
        data={points}
        colorVar="chart-1"
        testId="analytics-chart-cardsCreated"
      />
    )

    expect(screen.getAllByTestId(/analytics-bar-cardsCreated-/)).toHaveLength(
      points.length
    )
    for (let i = 0; i < points.length; i++) {
      const rect = screen.getByTestId(`analytics-bar-cardsCreated-${i}`)
      expect(rect).toHaveAttribute("data-value", String(points[i].value))
    }
  })

  it("gives every rect a native title tooltip", () => {
    render(
      <BarChart
        title="Cards created"
        data={points}
        colorVar="chart-1"
        testId="analytics-chart-cardsCreated"
      />
    )

    for (let i = 0; i < points.length; i++) {
      const rect = screen.getByTestId(`analytics-bar-cardsCreated-${i}`)
      expect(rect.querySelector("title")?.textContent).toBe(
        `${points[i].date}: ${points[i].value}`
      )
    }
  })

  it("renders nothing for an all-zero series (parent handles the empty state)", () => {
    const { container } = render(
      <BarChart
        title="Cards created"
        data={[
          { date: "2026-08-01", value: 0 },
          { date: "2026-08-02", value: 0 },
        ]}
        colorVar="chart-1"
        testId="analytics-chart-cardsCreated"
      />
    )

    expect(
      screen.queryByTestId("analytics-chart-cardsCreated")
    ).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })
})
