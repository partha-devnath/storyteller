import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const { approveMutate, rejectMutate } = vi.hoisted(() => ({
  approveMutate: vi.fn(),
  rejectMutate: vi.fn(),
}))

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
          newData: {
            title: "Loyalty card",
            description: "Reward repeat buyers.",
            acceptanceCriteria: ["Points accrue", "Redeem at checkout"],
            priority: "high",
            status: "backlog",
          },
          relationSummary: [
            {
              type: "dependency",
              sourceCardId: "c9",
              note: "depends on checkout",
            },
          ],
          conflictFlags: [
            { type: "conflict", summary: "overlaps with card X" },
          ],
        },
      ],
    },
  }),
  useApproveProposal: () => ({ mutate: approveMutate, isPending: false }),
  useRejectProposal: () => ({ mutate: rejectMutate, isPending: false }),
}))

describe("ProposalDrawer", () => {
  async function renderDrawer() {
    const { ProposalDrawer } = await import("../proposal-drawer")
    return render(
      <MemoryRouter>
        <ProposalDrawer
          proposalId="prop_1"
          open
          onClose={vi.fn()}
          projectSlug="loyalty"
        />
      </MemoryRouter>
    )
  }

  it("renders proposed card title, description and criteria", async () => {
    await renderDrawer()
    expect(screen.getByTestId("proposal-drawer-title")).toHaveTextContent(
      "Loyalty card"
    )
    expect(screen.getByText("Reward repeat buyers.")).toBeInTheDocument()
    expect(screen.getByText("Points accrue")).toBeInTheDocument()
    expect(screen.getByText("Redeem at checkout")).toBeInTheDocument()
  })

  it("shows conflict flags and relation notes", async () => {
    await renderDrawer()
    expect(screen.getByText(/overlaps with card X/)).toBeInTheDocument()
    expect(screen.getByText("dependency")).toBeInTheDocument()
    expect(screen.getByText(/depends on checkout/)).toBeInTheDocument()
  })

  it("approve button calls approve mutation", async () => {
    await renderDrawer()
    fireEvent.click(screen.getByTestId("approve-proposal"))
    expect(approveMutate).toHaveBeenCalledWith("prop_1", expect.any(Object))
  })

  it("reject flow shows reason input and confirms", async () => {
    await renderDrawer()
    fireEvent.click(screen.getByRole("button", { name: "Reject" }))
    const input = screen.getByPlaceholderText("Reason (optional)")
    fireEvent.change(input, { target: { value: "Too broad" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }))
    expect(rejectMutate).toHaveBeenCalledWith(
      { id: "prop_1", reason: "Too broad" },
      expect.any(Object)
    )
  })
})
