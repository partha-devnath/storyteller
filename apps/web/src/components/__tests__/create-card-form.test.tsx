import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

const { createMutate } = vi.hoisted(() => ({ createMutate: vi.fn() }))

vi.mock("@/hooks/use-cards", () => ({
  useCreateCard: () => ({ mutateAsync: createMutate, isPending: false }),
}))

vi.mock("@/hooks/use-projects", () => ({
  useProject: () => ({
    data: {
      project: {
        id: "p1",
        name: "Loyalty",
        slug: "loyalty",
        description: null,
        orgId: "org1",
        columns: [],
        cardSections: [
          {
            key: "description",
            label: "Description",
            description: "What the requirement does and why it matters.",
            builtIn: true,
          },
          {
            key: "acceptanceCriteria",
            label: "Acceptance criteria",
            description: "The concrete checks that must pass.",
            builtIn: true,
          },
          {
            key: "valueAddition",
            label: "Value addition",
            description: "What this feature delivers.",
            builtIn: false,
          },
        ],
      },
      epics: [],
      cards: [],
    },
  }),
}))

describe("CreateCardForm", () => {
  function wrapper({ children }: { children: ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }

  async function renderForm() {
    const { CreateCardForm } = await import("../create-card-form")
    return render(<CreateCardForm projectSlug="loyalty" />, { wrapper })
  }

  it("renders inputs for custom card sections only", async () => {
    await renderForm()
    expect(screen.getByText("Value addition")).toBeInTheDocument()
    expect(screen.getByLabelText("Value addition")).toBeInTheDocument()
  })

  it("submits filled sections with the new card", async () => {
    await renderForm()
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "New feature" },
    })
    fireEvent.change(screen.getByLabelText("Value addition"), {
      target: { value: "Boosts retention" },
    })
    fireEvent.click(screen.getByTestId("settings-create-card"))
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: { valueAddition: "Boosts retention" },
      })
    )
  })

  it("omits empty sections from the submission", async () => {
    await renderForm()
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "New feature" },
    })
    fireEvent.click(screen.getByTestId("settings-create-card"))
    expect(createMutate).toHaveBeenCalledWith(
      expect.not.objectContaining({ sections: expect.anything() })
    )
  })
})
