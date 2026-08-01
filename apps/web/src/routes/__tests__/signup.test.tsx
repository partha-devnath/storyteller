import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { SignupPage } from "../signup"

const mockSignUpEmail = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth-client", () => ({
  signUp: { email: mockSignUpEmail },
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>
  )
}

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders sign up form with all fields", () => {
    renderPage()
    expect(screen.getByLabelText("Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Create account" })
    ).toBeInTheDocument()
  })

  it("renders link to sign in", () => {
    renderPage()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login"
    )
  })

  it("calls signUp.email and navigates to /verify-email on success", async () => {
    mockSignUpEmail.mockResolvedValue({})
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Name"), "Test User")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.type(screen.getByLabelText("Confirm password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await vi.waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith({
        name: "Test User",
        email: "a@b.com",
        password: "Testpass1",
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith("/verify-email")
  })

  it("shows error message when sign up returns an error", async () => {
    mockSignUpEmail.mockResolvedValue({
      error: { message: "Email already in use" },
    })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Name"), "Test")
    await user.type(screen.getByLabelText("Email"), "taken@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.type(screen.getByLabelText("Confirm password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(await screen.findByText("Email already in use")).toBeInTheDocument()
  })

  it("shows unexpected error on exception", async () => {
    mockSignUpEmail.mockRejectedValue(new Error("network"))
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Name"), "Test")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.type(screen.getByLabelText("Confirm password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      await screen.findByText("An unexpected error occurred")
    ).toBeInTheDocument()
  })

  it("shows loading state while creating account", async () => {
    mockSignUpEmail.mockImplementation(() => new Promise(() => {}))
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Name"), "Test")
    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "Testpass1")
    await user.type(screen.getByLabelText("Confirm password"), "Testpass1")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    expect(
      await screen.findByRole("button", { name: "Creating account..." })
    ).toBeDisabled()
  })
})
