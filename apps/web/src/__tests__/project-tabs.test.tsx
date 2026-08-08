import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { ProjectTabs } from "@/components/project-tabs"

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:slug/*" element={<ProjectTabs slug="acme" />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("ProjectTabs", () => {
  it("renders AI, Board, Graph", () => {
    renderAt("/projects/acme")
    expect(screen.getByRole("tab", { name: "AI" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Board" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Graph" })).toBeInTheDocument()
  })

  it("Board active on board view", () => {
    renderAt("/projects/acme")
    expect(screen.getByTestId("view-switcher-board")).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("Graph active on ?view=graph", () => {
    renderAt("/projects/acme?view=graph")
    expect(screen.getByTestId("view-switcher-graph")).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("Board is not active on graph view", () => {
    renderAt("/projects/acme?view=graph")
    expect(screen.getByTestId("view-switcher-board")).not.toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByTestId("view-switcher-graph")).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("AI active on proposals route", () => {
    renderAt("/projects/acme/proposals")
    expect(screen.getByRole("tab", { name: "AI" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })
})
