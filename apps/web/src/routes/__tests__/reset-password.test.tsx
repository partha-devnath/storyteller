import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ResetPasswordPage } from "../reset-password"

const mockResetPassword = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth-client", () => ({
  resetPassword: mockResetPassword,
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))

function renderPage(token?: string) {
  const initialEntries = token
    ? [`/reset-password?token=${token}`]
    : ["/reset-password"]
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ResetPasswordPage />
    </MemoryRouter>
  )
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows invalid link when no token is present", () => {
    renderPage()
    expect(screen.getByText("Invalid reset link")).toBeInTheDocument()
    expect(
      screen.getByText("This link is invalid or expired.")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Request a new link" })
    ).toHaveAttribute("href", "/forgot-password")
  })

  it("renders password reset form when token is present", () => {
    renderPage("valid-token")
    expect(screen.getAllByText("Reset password")).toHaveLength(2)
    expect(screen.getByLabelText("New password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Reset password" })
    ).toBeInTheDocument()
  })

  it("calls resetPassword and navigates to /login on success", async () => {
    mockResetPassword.mockResolvedValue({})
    renderPage("token123")
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("New password"), "Newpass123")
    await user.type(screen.getByLabelText("Confirm new password"), "Newpass123")
    await user.click(screen.getByRole("button", { name: "Reset password" }))

    await vi.waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        newPassword: "Newpass123",
        token: "token123",
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith("/login")
  })

  it("shows error when password reset fails", async () => {
    mockResetPassword.mockResolvedValue({ error: { message: "Token expired" } })
    renderPage("token123")
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("New password"), "Newpass123")
    await user.type(screen.getByLabelText("Confirm new password"), "Newpass123")
    await user.click(screen.getByRole("button", { name: "Reset password" }))

    expect(await screen.findByText("Token expired")).toBeInTheDocument()
  })

  it("shows unexpected error on exception", async () => {
    mockResetPassword.mockRejectedValue(new Error("network"))
    renderPage("token123")
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("New password"), "Newpass123")
    await user.type(screen.getByLabelText("Confirm new password"), "Newpass123")
    await user.click(screen.getByRole("button", { name: "Reset password" }))

    expect(
      await screen.findByText("An unexpected error occurred")
    ).toBeInTheDocument()
  })
})
