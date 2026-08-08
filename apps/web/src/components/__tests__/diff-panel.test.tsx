import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { DiffPanel } from "../diff-panel"

describe("DiffPanel", () => {
  it("renders added lines for a new description", () => {
    render(<DiffPanel before="old content" after="new content" />)
    expect(screen.getByTestId("diff-panel")).toBeInTheDocument()
    expect(screen.getByText("+")).toBeInTheDocument()
  })

  it("renders an empty state when both sides are missing", () => {
    render(<DiffPanel before="" after="" />)
    expect(screen.getByText("No changes.")).toBeInTheDocument()
  })
})
