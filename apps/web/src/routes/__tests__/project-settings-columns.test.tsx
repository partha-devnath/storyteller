import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const { updateMutate, connectMutate, disconnectMutate } = vi.hoisted(() => ({
  updateMutate: vi.fn(),
  connectMutate: vi.fn(),
  disconnectMutate: vi.fn(),
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
        columns: [
          { key: "backlog", title: "Backlog", locked: true },
          { key: "review", title: "Review", locked: true },
          { key: "todo", title: "To Do", locked: false },
        ],
        cardSections: [],
      },
      epics: [],
      cards: [],
    },
  }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("@/hooks/use-integrations", () => ({
  useUpdateColumns: () => ({ mutate: updateMutate, isPending: false }),
  useConnectColumn: () => ({ mutate: connectMutate, isPending: false }),
  useDisconnectColumn: () => ({ mutate: disconnectMutate, isPending: false }),
  useTrelloBoards: () => ({ data: [{ id: "b1", name: "Product" }] }),
  useTrelloLists: () => ({ data: [{ id: "l1", name: "Backlog" }] }),
}))

describe("ProjectSettingsPage board columns", () => {
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

  it("renders locked columns without actions", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    expect(screen.getAllByText("system")).toHaveLength(2)
  })

  it("adds a column with an auto-generated key", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    fireEvent.click(screen.getByTestId("add-column"))
    fireEvent.change(screen.getByTestId("column-title"), {
      target: { value: "QA" },
    })
    fireEvent.click(screen.getByTestId("column-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      { key: "backlog", title: "Backlog", locked: true },
      { key: "review", title: "Review", locked: true },
      { key: "todo", title: "To Do", locked: false },
      { key: "qa", title: "QA", locked: false, integration: null },
    ])
  })

  it("renames a non-locked column keeping its key", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    fireEvent.click(screen.getByTestId("edit-column-todo"))
    fireEvent.change(screen.getByTestId("column-title"), {
      target: { value: "In work" },
    })
    fireEvent.click(screen.getByTestId("column-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      { key: "backlog", title: "Backlog", locked: true },
      { key: "review", title: "Review", locked: true },
      { key: "todo", title: "In work", locked: false },
    ])
  })

  it("connects a column to github", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Board columns" }))
    fireEvent.click(screen.getByTestId("connect-column-todo"))
    fireEvent.change(screen.getByTestId("connect-provider"), {
      target: { value: "github" },
    })
    fireEvent.change(screen.getByTestId("connect-token"), {
      target: { value: "ghp_test" },
    })
    fireEvent.change(screen.getByTestId("connect-target"), {
      target: { value: "acme/repo" },
    })
    fireEvent.click(screen.getByTestId("connect-save"))
    expect(connectMutate).toHaveBeenCalledWith(
      {
        columnKey: "todo",
        provider: "github",
        auth: "pat",
        config: { token: "ghp_test" },
        target: "acme/repo",
      },
      expect.any(Object)
    )
  })
})
