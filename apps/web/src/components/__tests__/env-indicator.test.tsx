import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { EnvIndicator } from "../env-indicator"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("EnvIndicator", () => {
  it("renders the Staging pill when VITE_APP_ENV=staging", () => {
    vi.stubEnv("VITE_APP_ENV", "staging")
    render(<EnvIndicator />)
    const badge = screen.getByTestId("env-badge")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute("data-env", "staging")
    expect(badge).toHaveTextContent("Staging")
  })

  it("renders nothing when VITE_APP_ENV is unset and MODE is production", () => {
    vi.stubEnv("VITE_APP_ENV", "")
    vi.stubEnv("MODE", "production")
    render(<EnvIndicator />)
    expect(screen.queryByTestId("env-badge")).not.toBeInTheDocument()
  })

  it("renders nothing in development mode", () => {
    vi.stubEnv("VITE_APP_ENV", "")
    vi.stubEnv("MODE", "development")
    render(<EnvIndicator />)
    expect(screen.queryByTestId("env-badge")).not.toBeInTheDocument()
  })
})
