import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { ProtectedRoute, PublicRoute } from "../protected-route"

const mockUseSession = vi.fn()

vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe("ProtectedRoute", () => {
  it("shows loading when isPending", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    renderWithRouter(<ProtectedRoute />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("redirects to login when no session", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    renderWithRouter(<ProtectedRoute />)
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  })

  it("renders outlet when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", email: "a@b.com" } },
      isPending: false,
    })
    renderWithRouter(<ProtectedRoute />)
  })
})

describe("PublicRoute", () => {
  it("shows loading when isPending", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    renderWithRouter(<PublicRoute />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("redirects to dashboard when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", email: "a@b.com" } },
      isPending: false,
    })
    renderWithRouter(<PublicRoute />)
  })

  it("renders outlet when no session", () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    renderWithRouter(<PublicRoute />)
  })
})
