import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "../components/button"

describe("Button", () => {
  it("renders with default variant", () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole("button", { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute("data-slot", "button")
  })

  it("renders as disabled", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <Button
        onClick={() => {
          clicked = true
        }}
      >
        Click
      </Button>
    )
    await user.click(screen.getByRole("button"))
    expect(clicked).toBe(true)
  })

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <Button
        disabled
        onClick={() => {
          clicked = true
        }}
      >
        Click
      </Button>
    )
    await user.click(screen.getByRole("button"))
    expect(clicked).toBe(false)
  })

  it("forwards additional className", () => {
    render(<Button className="custom-class">Styled</Button>)
    expect(screen.getByRole("button")).toHaveClass("custom-class")
  })
})
