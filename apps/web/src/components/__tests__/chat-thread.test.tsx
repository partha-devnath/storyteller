import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

vi.mock("@/hooks/use-proposals", () => ({
  useProposal: () => ({
    data: {
      proposal: {
        id: "prop_1",
        instruction: "Build loyalty",
        status: "pending",
        createdAt: "",
      },
      changes: [
        {
          id: "ch1",
          changeType: "create",
          targetCardId: null,
          newData: { title: "Loyalty card" },
          relationSummary: [],
          conflictFlags: [],
        },
      ],
    },
  }),
  useApproveProposal: () => ({ mutate: vi.fn(), isPending: false }),
  useRejectProposal: () => ({ mutate: vi.fn(), isPending: false }),
}))

const messages = [
  {
    id: "m1",
    projectId: "p1",
    role: "user" as const,
    kind: "prompt" as const,
    content: "Build a loyalty program",
    questions: null,
    proposalId: null,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "m2",
    projectId: "p1",
    role: "ai" as const,
    kind: "board" as const,
    content: "Generated 3 cards",
    questions: null,
    proposalId: "prop_1",
    createdAt: "",
    updatedAt: "",
  },
]

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe("ChatThread", () => {
  it("renders a user prompt", async () => {
    const { ChatThread } = await import("../chat-thread")
    render(
      <ChatThread
        messages={messages.slice(0, 1)}
        projectSlug="acme"
        onClarifyAnswer={vi.fn()}
      />,
      { wrapper }
    )
    expect(screen.getByText("Build a loyalty program")).toBeInTheDocument()
  })

  it("renders a board reply with approve/reject actions", async () => {
    const { ChatThread } = await import("../chat-thread")
    render(
      <ChatThread
        messages={messages}
        projectSlug="acme"
        onClarifyAnswer={vi.fn()}
      />,
      { wrapper }
    )
    expect(screen.getByText("Generated 3 cards")).toBeInTheDocument()
    expect(await screen.findByText(/Loyalty card/)).toBeInTheDocument()
    expect(screen.getByTestId("approve-proposal")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument()
  })

  it("shows the AI loading indicator while answers are being processed", async () => {
    const { ChatThread } = await import("../chat-thread")
    render(
      <ChatThread
        messages={messages}
        projectSlug="acme"
        aiPending
        onClarifyAnswer={vi.fn()}
      />,
      { wrapper }
    )
    expect(screen.getByTestId("ai-loading")).toBeInTheDocument()
  })

  it("answers clarifying questions inline as a reply", async () => {
    const { ChatThread } = await import("../chat-thread")
    const onClarifyAnswer = vi.fn()
    const clarifyMessages = [
      ...messages,
      {
        id: "m3",
        projectId: "p1",
        role: "ai" as const,
        kind: "clarifying" as const,
        content: "",
        questions: [
          { question: "Which base?", options: ["All", "New"] },
          { question: "Expiry?" },
        ],
        proposalId: null,
        createdAt: "",
        updatedAt: "",
      },
    ]
    render(
      <ChatThread
        messages={clarifyMessages}
        projectSlug="acme"
        onClarifyAnswer={onClarifyAnswer}
      />,
      { wrapper }
    )
    expect(
      screen.getByText("A few questions to clarify the board:")
    ).toBeInTheDocument()
    expect(screen.getByText(/Which base\?/)).toBeInTheDocument()

    await screen.getByTestId("chat-clarify-answer").click()
    const inputs = screen.getAllByTestId("clarify-answer")
    expect(inputs).toHaveLength(2)

    await userEvent.type(inputs[0], "All users")
    await screen.getByTestId("chat-clarify-submit").click()
    expect(onClarifyAnswer).toHaveBeenCalledWith(2, ["All users", ""])
  })
})
