import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BoardCard } from "../board-card"

const card = {
  id: "c1",
  keyNo: 1,
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
    expect(screen.getByText("closed")).toBeInTheDocument()
  })

  it("renders the req key and footer meta", () => {
    render(<BoardCard card={card} isClosed={false} />)
    expect(screen.getByText("REQ-001")).toBeInTheDocument()
    expect(screen.getByText("3 criteria")).toBeInTheDocument()
  })

  it("shows a provider indicator when the card has external links", () => {
    render(
      <BoardCard
        card={{
          ...card,
          externalLinks: [
            {
              id: "link1",
              type: "github",
              externalId: "42",
              url: "https://github.com/acme/repo/issues/42",
              columnKey: "review",
              credentialId: "cred1",
              createdAt: "2026-08-01T00:00:00Z",
            },
          ],
        }}
        isClosed={false}
      />
    )
    expect(screen.getByTestId("external-indicator")).toBeInTheDocument()
    expect(screen.getByText("GH")).toBeInTheDocument()
  })
})
