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

vi.mock("@/hooks/use-billing", () => ({
  useBilling: () => ({ data: undefined }),
  useUsage: () => ({
    usage: { projects: 0, members: 0, aiActions: 0, cards: 0 },
    limits: { projects: null, members: null, aiActions: null, cards: null },
    plan: null,
    isAtLimit: () => false,
    pct: () => 0,
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
