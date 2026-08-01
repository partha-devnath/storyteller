import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { VerifyEmailPage } from "../verify-email"

const mockVerifyEmail = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth-client", () => ({
  verifyEmail: mockVerifyEmail,
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))

function renderPage(token?: string) {
  const initialEntries = token
    ? [`/verify-email?token=${token}`]
    : ["/verify-email"]
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <VerifyEmailPage />
    </MemoryRouter>
  )
}

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows verify prompt when no token is present", () => {
    renderPage()
    expect(screen.getByText("Verify your email")).toBeInTheDocument()
    expect(
      screen.getByText(/We sent you a verification link/)
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
      "href",
      "/login"
    )
  })

  it("shows verifying state when token is present", () => {
    mockVerifyEmail.mockImplementation(() => new Promise(() => {}))
    renderPage("token-xyz")
    expect(screen.getByText("Verifying your email...")).toBeInTheDocument()
    expect(mockVerifyEmail).toHaveBeenCalledWith({
      query: { token: "token-xyz" },
    })
  })

  it("shows success after verification", async () => {
    mockVerifyEmail.mockResolvedValue({})
    renderPage("token-xyz")

    expect(await screen.findByText("Email verified!")).toBeInTheDocument()
    expect(screen.getByText("Redirecting to login...")).toBeInTheDocument()
  })

  it("shows error when verification fails", async () => {
    mockVerifyEmail.mockResolvedValue({ error: { message: "Invalid token" } })
    renderPage("token-xyz")

    expect(await screen.findByText("Invalid token")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Back to login" })
    ).toBeInTheDocument()
  })

  it("shows unexpected error on exception", async () => {
    mockVerifyEmail.mockRejectedValue(new Error("network"))
    renderPage("token-xyz")

    expect(
      await screen.findByText("An unexpected error occurred")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Back to login" })
    ).toBeInTheDocument()
  })
})
