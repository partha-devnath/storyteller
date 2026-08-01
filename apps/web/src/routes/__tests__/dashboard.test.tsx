import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode } from "react"
import { DashboardPage } from "../dashboard"

const mockLogout = vi.fn()
const mockUseAuth = vi.fn()
const mockUseUser = vi.fn()

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("@/hooks/use-user", () => ({
  useUser: () => mockUseUser(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders dashboard with user info", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", name: "Test", email: "test@test.com" },
      logout: mockLogout,
      isPending: false,
    })
    mockUseUser.mockReturnValue({
      data: { id: "1", name: "Test" },
      isLoading: false,
    })

    render(<DashboardPage />, { wrapper: createWrapper() })
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Sign out")).toBeInTheDocument()
    const preBlocks = screen.getAllByText(/"id": "1"/)
    expect(preBlocks).toHaveLength(2)
    expect(screen.getByText("Session info")).toBeInTheDocument()
    expect(screen.getByText("API protected route")).toBeInTheDocument()
  })

  it("shows loading state when useUser is loading", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", name: "Test", email: "test@test.com" },
      logout: mockLogout,
      isPending: false,
    })
    mockUseUser.mockReturnValue({
      data: null,
      isLoading: true,
    })

    render(<DashboardPage />, { wrapper: createWrapper() })
    expect(screen.getByText("Loading user data...")).toBeInTheDocument()
  })

  it("toggles sidebar text when button is clicked", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", name: "Test", email: "test@test.com" },
      logout: mockLogout,
      isPending: false,
    })
    mockUseUser.mockReturnValue({
      data: null,
      isLoading: false,
    })

    render(<DashboardPage />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    expect(screen.getByText("Hide sidebar")).toBeInTheDocument()
    await user.click(screen.getByText("Hide sidebar"))
    expect(screen.getByText("Show sidebar")).toBeInTheDocument()
  })

  it("calls logout when sign out button is clicked", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", name: "Test", email: "test@test.com" },
      logout: mockLogout,
      isPending: false,
    })
    mockUseUser.mockReturnValue({
      data: null,
      isLoading: false,
    })

    render(<DashboardPage />, { wrapper: createWrapper() })
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Sign out" }))
    expect(mockLogout).toHaveBeenCalled()
  })
})
