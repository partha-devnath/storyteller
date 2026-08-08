import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { LandingPage } from "../landing"

describe("LandingPage", () => {
  it("renders the hero CTA links", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
    expect(
      screen.getByRole("link", { name: "Get started" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument()
  })
})
