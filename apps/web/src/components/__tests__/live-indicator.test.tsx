import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

describe("LiveIndicator", () => {
  it.each([
    ["connecting", "Connecting…"],
    ["open", "Live"],
    ["closed", "Offline — updates paused"],
  ] as const)(
    "renders %s status copy with data-status=%s",
    async (status, copy) => {
      const { LiveIndicator } = await import("../live-indicator")
      render(<LiveIndicator status={status} onRetry={vi.fn()} />)
      const indicator = screen.getByTestId("live-indicator")
      expect(indicator).toHaveAttribute("data-status", status)
      expect(screen.getByText(copy)).toBeInTheDocument()
    }
  )

  it("calls onRetry when the Retry button is clicked in closed state", async () => {
    const { LiveIndicator } = await import("../live-indicator")
    const onRetry = vi.fn()
    render(<LiveIndicator status="closed" onRetry={onRetry} />)
    fireEvent.click(screen.getByText("Retry"))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
