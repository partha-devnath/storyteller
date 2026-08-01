import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ErrorBoundary } from "../error-boundary"

function Bomb({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("kaboom")
  }
  return <p>safe</p>
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>content</p>
      </ErrorBoundary>
    )
    expect(screen.getByText("content")).toBeInTheDocument()
  })

  it("renders default fallback on error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByText("kaboom")).toBeInTheDocument()
  })

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>custom error UI</p>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText("custom error UI")).toBeInTheDocument()
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument()
  })

  it("resets error state on Try again click", async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <p>recovered</p>
      </ErrorBoundary>
    )

    await user.click(screen.getByRole("button", { name: /try again/i }))
    expect(screen.getByText("recovered")).toBeInTheDocument()
  })
})
