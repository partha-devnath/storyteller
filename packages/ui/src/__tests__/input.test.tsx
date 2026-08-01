import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Input } from "../components/input"

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument()
  })

  it("renders with type", () => {
    render(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute(
      "type",
      "email"
    )
  })

  it("accepts user input", async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)
    const input = screen.getByPlaceholderText("Type here")
    await user.type(input, "hello")
    expect(input).toHaveValue("hello")
  })

  it("forwards disabled prop", () => {
    render(<Input disabled placeholder="Disabled" />)
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled()
  })

  it("forwards className", () => {
    render(<Input className="custom" placeholder="Test" />)
    expect(screen.getByPlaceholderText("Test")).toHaveClass("custom")
  })
})
