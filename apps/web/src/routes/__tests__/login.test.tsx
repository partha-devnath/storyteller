import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { LoginPage } from "../login"

const mockSignInEmail = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth-client", () => ({
  signIn: { email: mockSignInEmail },
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders sign in form with email, password, and submit button", () => {
    renderPage()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
  })

  it("renders links to signup and forgot password", () => {
    renderPage()
    expect(
      screen.getByRole("link", { name: "Create account" })
    ).toHaveAttribute("href", "/signup")
    expect(
      screen.getByRole("link", { name: "Forgot password?" })
    ).toHaveAttribute("href", "/forgot-password")
  })

  it("shows validation errors for empty fields on submit", async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByText("Invalid email address")).toBeInTheDocument()
  })

  it("calls signIn.email and navigates to /dashboard on success", async () => {
    mockSignInEmail.mockResolvedValue({})
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await vi.waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "a@b.com",
        password: "Testpass1",
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
  })

  it("shows error message when sign in returns an error", async () => {
    mockSignInEmail.mockResolvedValue({
      error: { message: "Invalid credentials" },
    })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Wrongpass1")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
  })

  it("shows unexpected error on exception", async () => {
    mockSignInEmail.mockRejectedValue(new Error("network"))
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      await screen.findByText("An unexpected error occurred")
    ).toBeInTheDocument()
  })

  it("shows loading state while signing in", async () => {
    mockSignInEmail.mockImplementation(() => new Promise(() => {}))
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(
      await screen.findByRole("button", { name: "Signing in..." })
    ).toBeDisabled()
  })
})
