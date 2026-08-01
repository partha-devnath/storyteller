import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Label } from "../components/label"

describe("Label", () => {
  it("renders with text", () => {
    render(<Label>Email</Label>)
    expect(screen.getByText("Email")).toBeInTheDocument()
  })

  it("has data-slot attribute", () => {
    render(<Label>Name</Label>)
    expect(screen.getByText("Name")).toHaveAttribute("data-slot", "label")
  })

  it("forwards htmlFor", () => {
    render(<Label htmlFor="email-input">Email</Label>)
    expect(screen.getByText("Email")).toHaveAttribute("for", "email-input")
  })

  it("forwards className", () => {
    render(<Label className="custom">Label</Label>)
    expect(screen.getByText("Label")).toHaveClass("custom")
  })
})
