import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

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
    externalLinks: [
      {
        id: "link1",
        type: "github",
        externalId: "42",
        url: "https://github.com/acme/repo/issues/42",
        columnKey: "review",
        createdAt: "2026-08-01T00:00:00Z",
      },
    ],
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
  useCardExternalLink: () => ({
    data: {
      state: "open",
      url: "https://github.com/acme/repo/issues/42",
      comments: [
        {
          author: "alice",
          text: "Needs spec",
          createdAt: "2026-08-01T00:00:00Z",
        },
      ],
    },
  }),
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
  async function renderDrawer() {
    const { CardDrawer } = await import("../card-drawer")
    return render(
      <MemoryRouter>
        <CardDrawer cardId="c1" open onClose={vi.fn()} projectSlug="loyalty" />
      </MemoryRouter>
    )
  }

  it("renders details tab content and comments section", async () => {
    await renderDrawer()
    expect(screen.getByText("Loyalty enrollment flow")).toBeInTheDocument()
    expect(screen.getByText("Enrolls")).toBeInTheDocument()
    expect(screen.getByText("Acceptance criteria")).toBeInTheDocument()
  })

  it("switches to the history tab and shows version entries", async () => {
    await renderDrawer()
    fireEvent.click(screen.getByTestId("history-tab"))
    expect(screen.getByText("v2")).toBeInTheDocument()
    expect(screen.getByText("v1")).toBeInTheDocument()
  })

  it("copies the deep link URL on click", async () => {
    await renderDrawer()
    fireEvent.click(screen.getByTestId("copy-link"))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("/project/loyalty/card/loyalty-enroll")
    )
  })

  it("renders the external ticket section with live state and comments", async () => {
    await renderDrawer()
    expect(screen.getByText("External ticket")).toBeInTheDocument()
    expect(screen.getByText("github")).toBeInTheDocument()
    expect(screen.getByText("open")).toBeInTheDocument()
    expect(screen.getByText(/Needs spec/)).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /github.com\/acme\/repo\/issues\/42/ })
    ).toBeInTheDocument()
  })
})
