import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Ada", email: "ada@x.com" },
    logout: vi.fn(),
    session: null,
    isPending: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    requestReset: vi.fn(),
    confirmReset: vi.fn(),
  }),
}))

vi.mock("@/hooks/use-orgs", () => ({
  useOrgs: () => ({
    data: [
      {
        id: "org1",
        name: "Acme",
        slug: "acme",
        role: "admin",
        createdAt: "",
      },
    ],
    isLoading: false,
  }),
}))

const { AppShell } = await import("../app-shell")
const { OrgSwitcher } = await import("../org-switcher")

beforeEach(() => {
  vi.clearAllMocks()
})

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe("AppShell", () => {
  it("renders the brand, org switcher, and a sign-out button", () => {
    renderWithRouter(<AppShell />)
    expect(screen.getByText("Storyteller")).toBeInTheDocument()
    expect(screen.getAllByText(/Acme/).length).toBeGreaterThan(0)
    expect(screen.getByText("Sign out")).toBeInTheDocument()
  })

  it("shows the org role badge from the active membership", () => {
    renderWithRouter(<AppShell />)
    expect(screen.getByText("admin")).toBeInTheDocument()
  })
})

describe("OrgSwitcher", () => {
  it("lists organizations and selects on click", () => {
    renderWithRouter(<OrgSwitcher />)
    const acmeBtn = screen.getByText(/Acme/)
    expect(acmeBtn).toBeInTheDocument()
    fireEvent.click(acmeBtn)
  })
})
