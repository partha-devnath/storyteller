import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { DEFAULT_CARD_SECTIONS } from "@workspace/schemas"

const { updateMutate } = vi.hoisted(() => ({ updateMutate: vi.fn() }))

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
          ...DEFAULT_CARD_SECTIONS,
          {
            key: "teamSize",
            label: "Team size",
            description: "People affected.",
            builtIn: false,
          },
        ],
      },
      epics: [],
      cards: [],
    },
  }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: updateMutate, isPending: false }),
}))

describe("ProjectSettingsPage card sections", () => {
  async function renderSettings() {
    const { ProjectSettingsPage } = await import("../project-settings")
    return render(
      <MemoryRouter>
        <ProjectSettingsPage />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    updateMutate.mockClear()
  })

  it("renders built-ins locked without edit/delete buttons", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    expect(screen.getAllByText("built-in")).toHaveLength(2)
    expect(screen.getByText("Team size")).toBeInTheDocument()
  })

  it("adds a section with an auto-generated camelCase key", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    fireEvent.click(screen.getByTestId("add-section"))
    fireEvent.change(screen.getByTestId("section-label"), {
      target: { value: "Success metrics" },
    })
    fireEvent.change(screen.getByTestId("section-description"), {
      target: { value: "What success looks like." },
    })
    fireEvent.click(screen.getByTestId("section-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      ...DEFAULT_CARD_SECTIONS,
      {
        key: "teamSize",
        label: "Team size",
        description: "People affected.",
        builtIn: false,
      },
      {
        key: "successMetrics",
        label: "Success metrics",
        description: "What success looks like.",
        builtIn: false,
      },
    ])
  })

  it("edits a custom section label", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    fireEvent.click(screen.getByTestId("edit-section-teamSize"))
    fireEvent.change(screen.getByTestId("section-label"), {
      target: { value: "Team size (FTE)" },
    })
    fireEvent.click(screen.getByTestId("section-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      ...DEFAULT_CARD_SECTIONS,
      {
        key: "teamSize",
        label: "Team size (FTE)",
        description: "People affected.",
        builtIn: false,
      },
    ])
  })

  it("deletes a custom section after confirming", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    fireEvent.click(screen.getByTestId("delete-section-teamSize"))
    fireEvent.click(screen.getByTestId("confirm-delete-section"))
    expect(updateMutate).toHaveBeenCalledWith([...DEFAULT_CARD_SECTIONS])
  })
})
