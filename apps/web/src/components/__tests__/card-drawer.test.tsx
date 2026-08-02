import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

const mockDetail = {
  card: {
    id: "c1",
    title: "Loyalty enrollment flow",
    slug: "loyalty-enroll",
    description: "Users enroll in the program.",
    acceptanceCriteria: ["Enrolls", "Confirms"],
    status: "todo",
    priority: "high",
    isClosed: false,
    assigneeId: null,
    customFields: { team: "growth" },
    closedAt: null,
  },
  latestVersion: null,
  relations: [],
  comments: [],
  attachments: [],
}

const mockVersions = [
  {
    id: "v2",
    versionNo: 2,
    changeType: "update",
    title: "Loyalty enrollment flow",
    description: "Users enroll in the program.",
    acceptanceCriteria: [],
    status: "todo",
    priority: "high",
    createdBy: "u1",
    createdAt: "2026-01-02T00:00:00Z",
  },
  {
    id: "v1",
    versionNo: 1,
    changeType: "create",
    title: "Loyalty enrollment flow",
    description: "Users enroll in the program.",
    acceptanceCriteria: [],
    status: "backlog",
    priority: "high",
    createdBy: "u1",
    createdAt: "2026-01-01T00:00:00Z",
  },
]

vi.mock("@/hooks/use-cards", () => ({
  useCardDetail: () => ({ data: mockDetail }),
  useCardVersions: () => ({ data: mockVersions }),
  useCardSimilar: () => ({ data: [] }),
  useCardComments: () => ({ data: [] }),
  useAddComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCloseCard: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("@/hooks/use-orgs", () => ({
  useOrgMembers: () => ({ data: [] }),
}))

const writeText = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
})

describe("CardDrawer", () => {
  it("renders details tab content and comments section", async () => {
    const { CardDrawer } = await import("../card-drawer")
    render(
      <CardDrawer cardId="c1" open onClose={vi.fn()} projectSlug="loyalty" />
    )
    expect(screen.getByText("Loyalty enrollment flow")).toBeInTheDocument()
    expect(screen.getByText("Enrolls")).toBeInTheDocument()
    expect(screen.getByText("Acceptance criteria")).toBeInTheDocument()
  })

  it("switches to the history tab and shows version entries", async () => {
    const { CardDrawer } = await import("../card-drawer")
    render(
      <CardDrawer cardId="c1" open onClose={vi.fn()} projectSlug="loyalty" />
    )
    fireEvent.click(screen.getByTestId("history-tab"))
    expect(screen.getByText("v2")).toBeInTheDocument()
    expect(screen.getByText("v1")).toBeInTheDocument()
  })

  it("copies the deep link URL on click", async () => {
    const { CardDrawer } = await import("../card-drawer")
    render(
      <CardDrawer cardId="c1" open onClose={vi.fn()} projectSlug="loyalty" />
    )
    fireEvent.click(screen.getByTestId("copy-link"))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/project/loyalty/card/loyalty-enroll")
    )
  })
})
