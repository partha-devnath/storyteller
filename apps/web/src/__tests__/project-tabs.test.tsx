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
  it("renders Proposals, Board, Settings", () => {
    renderAt("/projects/acme")
    expect(screen.getByRole("tab", { name: "Proposals" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Board" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument()
  })

  it("Board active on board route", () => {
    renderAt("/projects/acme")
    expect(screen.getByRole("tab", { name: "Board" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("Proposals active on proposals route", () => {
    renderAt("/projects/acme/proposals")
    expect(screen.getByRole("tab", { name: "Proposals" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })

  it("Settings active on settings route", () => {
    renderAt("/projects/acme/settings")
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page"
    )
  })
})
