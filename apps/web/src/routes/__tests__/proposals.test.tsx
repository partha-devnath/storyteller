import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const mockUseProposals = vi.hoisted(() => vi.fn())
const mockUseChatMessages = vi.hoisted(() => vi.fn())
const mockUseChatSessions = vi.hoisted(() => vi.fn())
const mockUseChatScroll = vi.hoisted(() => vi.fn())
const mockChatThread = vi.hoisted(() => vi.fn())

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ slug: "test" }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock("@/hooks/use-ai", () => ({
  useAiGenerate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAiClarify: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock("@/hooks/use-proposals", () => ({
  useProposals: () => mockUseProposals(),
}))

vi.mock("@/hooks/use-projects", () => ({
  useProject: () => ({
    data: { project: { name: "Test Board", orgId: "org1" } },
  }),
}))

vi.mock("@/hooks/use-cards", () => ({
  useCards: () => ({ data: [] }),
}))

vi.mock("@/hooks/use-orgs", () => ({
  useOrgMembers: () => ({ data: [] }),
}))

vi.mock("@/hooks/use-project-events", () => ({
  useProjectEvents: () => ({ status: "connected", reconnect: vi.fn() }),
}))

vi.mock("@/hooks/use-billing", () => ({
  useUsage: () => ({ isAtLimit: () => false }),
  handleLimitError: () => false,
}))

vi.mock("@/hooks/use-chat", () => ({
  useChatMessages: () => mockUseChatMessages(),
  useAddChatMessage: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("@/hooks/use-chat-sessions", () => ({
  useChatSessions: () => mockUseChatSessions(),
  useCreateChatSession: () => ({ mutateAsync: vi.fn() }),
  useRenameChatSession: () => ({ mutate: vi.fn() }),
  useDeleteChatSession: () => ({ mutate: vi.fn() }),
}))

vi.mock("@/lib/use-chat-scroll", () => ({
  useChatScroll: () => mockUseChatScroll(),
}))

vi.mock("@/lib/mention-picker", () => ({
  useMentionPicker: () => ({
    mentionQuery: null,
    mentionCaret: 0,
    mentionEnd: 0,
    handleInput: vi.fn(),
    stopMention: vi.fn(),
  }),
}))

vi.mock("@/components/chat-thread", () => ({
  ChatThread: (props: Record<string, unknown>) => {
    mockChatThread(props)
    return <div data-testid="chat-thread" />
  },
}))

vi.mock("@/components/chat-session-sidebar", () => ({
  ChatSessionSidebar: () => <div data-testid="session-sidebar" />,
}))

vi.mock("@/components/project-tabs", () => ({
  ProjectTabs: () => <div data-testid="project-tabs" />,
}))

vi.mock("@/components/live-indicator", () => ({
  LiveIndicator: () => <div data-testid="live-indicator" />,
}))

vi.mock("@/components/mention-menu", () => ({
  MentionMenu: () => <div data-testid="mention-menu" />,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseProposals.mockReturnValue({ data: [] })
  mockUseChatMessages.mockReturnValue({ data: [] })
  mockUseChatSessions.mockReturnValue({ data: [] })
  mockUseChatScroll.mockReturnValue({
    containerRef: { current: null },
    showJump: false,
    handleScroll: vi.fn(),
    jumpToBottom: vi.fn(),
  })
})

describe("ProposalsPage", () => {
  it("shows starter prompts on empty chat and fills the input on click", async () => {
    const { ProposalsPage } = await import("../proposals")
    render(
      <MemoryRouter initialEntries={["/projects/test/proposals"]}>
        <ProposalsPage />
      </MemoryRouter>
    )

    const starter = screen.getByTestId("starter-prompt-0")
    expect(starter).toBeInTheDocument()
    fireEvent.click(starter)
    const input = screen.getByLabelText("AI instruction") as HTMLInputElement
    expect(input.value).toContain("onboarding")
  })

  it("renders review banner with a Review now action for pending proposals", async () => {
    mockUseProposals.mockReturnValue({
      data: [{ id: "p1", status: "pending", instruction: "x", changeCount: 2 }],
    })
    mockUseChatMessages.mockReturnValue({
      data: [
        {
          id: "m1",
          role: "ai",
          kind: "board",
          content: "Generated 1 card.",
          proposalId: "p1",
          questions: null,
          createdAt: "2026-08-01T00:00:00Z",
        },
      ],
    })
    const { ProposalsPage } = await import("../proposals")
    render(
      <MemoryRouter initialEntries={["/projects/test/proposals"]}>
        <ProposalsPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId("proposal-banner")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("review-proposals"))
    expect(mockChatThread).toHaveBeenCalledWith(
      expect.objectContaining({ highlightProposalId: "p1" })
    )
  })

  it("shows no banner when nothing is pending", async () => {
    mockUseProposals.mockReturnValue({
      data: [
        { id: "p1", status: "approved", instruction: "x", changeCount: 2 },
      ],
    })
    const { ProposalsPage } = await import("../proposals")
    render(
      <MemoryRouter initialEntries={["/projects/test/proposals"]}>
        <ProposalsPage />
      </MemoryRouter>
    )
    expect(screen.queryByTestId("proposal-banner")).not.toBeInTheDocument()
  })
})
