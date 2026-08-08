import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BoardCard } from "../board-card"

const card = {
  id: "c1",
  title: "Loyalty enrollment flow",
  slug: "loyalty-enroll",
  status: "todo",
  priority: "high" as const,
  isClosed: false,
  assigneeId: null,
  epicId: null,
  acceptanceCriteriaCount: 3,
  updatedAt: "2026-01-01T00:00:00Z",
}

describe("BoardCard", () => {
  it("renders title, priority badge, and criteria count", () => {
    render(<BoardCard card={card} isClosed={false} />)
    expect(screen.getByText("Loyalty enrollment flow")).toBeInTheDocument()
    expect(screen.getByText("P1")).toBeInTheDocument()
    expect(screen.getByText("3 criteria")).toBeInTheDocument()
  })

  it("renders a closed lock state when isClosed", () => {
    render(<BoardCard card={card} isClosed />)
    expect(screen.getByText("frozen")).toBeInTheDocument()
  })

  it("renders the card id and footer meta", () => {
    render(<BoardCard card={card} isClosed={false} />)
    expect(screen.getByText("c1")).toBeInTheDocument()
    expect(screen.getByText("3 criteria")).toBeInTheDocument()
  })
})
