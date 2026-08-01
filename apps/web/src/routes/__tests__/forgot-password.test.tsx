import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ForgotPasswordPage } from "../forgot-password"

const mockRequestPasswordReset = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth-client", () => ({
  requestPasswordReset: mockRequestPasswordReset,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  )
}

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders email form", () => {
    renderPage()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Send reset link" })
    ).toBeInTheDocument()
  })

  it("renders back to login link", () => {
    renderPage()
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
      "href",
      "/login"
    )
  })

  it("shows success screen after sending email", async () => {
    mockRequestPasswordReset.mockResolvedValue({})
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.click(screen.getByRole("button", { name: "Send reset link" }))

    expect(await screen.findByText("Check your email")).toBeInTheDocument()
    expect(
      screen.getByText(/If an account with that email exists/)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Back to login" })
    ).toBeInTheDocument()
  })

  it("shows error when request fails", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      error: { message: "Rate limited" },
    })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.click(screen.getByRole("button", { name: "Send reset link" }))

    expect(await screen.findByText("Rate limited")).toBeInTheDocument()
    expect(screen.queryByText("Check your email")).not.toBeInTheDocument()
  })

  it("shows unexpected error on exception", async () => {
    mockRequestPasswordReset.mockRejectedValue(new Error("network"))
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Email"), "a@b.com")
    await user.click(screen.getByRole("button", { name: "Send reset link" }))

    expect(
      await screen.findByText("An unexpected error occurred")
    ).toBeInTheDocument()
  })
})
