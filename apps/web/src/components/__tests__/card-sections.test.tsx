import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CardSections } from "../card-sections"

describe("CardSections", () => {
  const config = [
    { key: "description", label: "Description", builtIn: true },
    { key: "acceptanceCriteria", label: "Acceptance criteria", builtIn: true },
    { key: "valueAddtion", label: "Value Addtion", builtIn: false },
  ]

  it("renders custom sections only, skipping built-in keys", () => {
    render(
      <CardSections
        sections={{
          description: "dupe",
          acceptanceCriteria: "dupe",
          valueAddtion: "Boosts retention",
        }}
        cardSections={config}
      />
    )
    expect(screen.getByText("Value Addtion")).toBeInTheDocument()
    expect(screen.getByText("Boosts retention")).toBeInTheDocument()
    expect(screen.queryByText("Description")).not.toBeInTheDocument()
    expect(screen.queryByText("Acceptance criteria")).not.toBeInTheDocument()
  })

  it("filters built-in keys by name when no config is passed", () => {
    render(<CardSections sections={{ description: "x", impact: "big" }} />)
    expect(screen.getByText("impact")).toBeInTheDocument()
    expect(screen.queryByText("description")).not.toBeInTheDocument()
  })

  it("renders nothing for empty or null sections", () => {
    const { container } = render(
      <CardSections sections={null} cardSections={config} />
    )
    expect(container.firstChild).toBeNull()
  })
})
