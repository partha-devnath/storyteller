import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const mockSetSearchParams = vi.fn()

vi.mock("react-router", () => ({
  useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
}))

describe("ViewSwitcher", () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear()
  })

  it("renders both triggers with the UI-SPEC testids", async () => {
    const { ViewSwitcher } = await import("../view-switcher")
    render(<ViewSwitcher />)
    expect(screen.getByTestId("view-switcher-board")).toBeInTheDocument()
    expect(screen.getByTestId("view-switcher-graph")).toBeInTheDocument()
    expect(screen.getByText("Board")).toBeInTheDocument()
    expect(screen.getByText("Graph")).toBeInTheDocument()
  })

  it("defaults to the board view when no view param is present", async () => {
    const { ViewSwitcher } = await import("../view-switcher")
    render(<ViewSwitcher />)
    expect(screen.getByTestId("view-switcher-board")).toHaveAttribute(
      "data-active"
    )
    expect(screen.getByTestId("view-switcher-graph")).not.toHaveAttribute(
      "data-active"
    )
  })

  it("writes view=graph to the search params when the graph tab is clicked", async () => {
    const { ViewSwitcher } = await import("../view-switcher")
    render(<ViewSwitcher />)
    fireEvent.click(screen.getByTestId("view-switcher-graph"))
    expect(mockSetSearchParams).toHaveBeenCalledWith(
      { view: "graph" },
      { replace: true }
    )
  })
})
