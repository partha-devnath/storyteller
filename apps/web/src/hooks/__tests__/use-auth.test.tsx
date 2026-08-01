import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { MemoryRouter } from "react-router"

const mockSignInEmail = vi.fn()
const mockSignUpEmail = vi.fn()
const mockSignOut = vi.fn()
const mockUseSession = vi.fn()
const mockRequestPwReset = vi.fn()
const mockResetPw = vi.fn()
const mockNavigate = vi.fn()

vi.mock("@/lib/auth-client", () => ({
  signIn: { email: mockSignInEmail },
  signUp: { email: mockSignUpEmail },
  signOut: mockSignOut,
  useSession: () => mockUseSession(),
  requestPasswordReset: mockRequestPwReset,
  resetPassword: mockResetPw,
}))

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}))

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns user and session from useSession", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", email: "a@b.com" } },
      isPending: false,
    })
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    expect(result.current.user).toEqual({ id: "1", email: "a@b.com" })
    expect(result.current.session).toEqual({
      user: { id: "1", email: "a@b.com" },
    })
    expect(result.current.isPending).toBe(false)
  })

  it("returns null user when no session", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    expect(result.current.user).toBeNull()
    expect(result.current.session).toBeNull()
  })

  it("login calls signIn.email and navigates to /dashboard", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockSignInEmail.mockResolvedValue({})
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await act(async () => {
      await result.current.login("a@b.com", "pass123")
    })
    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "pass123",
    })
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
  })

  it("login throws on auth error", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockSignInEmail.mockResolvedValue({
      error: { message: "Invalid credentials" },
    })
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await expect(result.current.login("a@b.com", "pass")).rejects.toThrow(
      "Invalid credentials"
    )
  })

  it("register calls signUp.email", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockSignUpEmail.mockResolvedValue({})
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await act(async () => {
      await result.current.register("Test", "a@b.com", "pass123")
    })
    expect(mockSignUpEmail).toHaveBeenCalledWith({
      name: "Test",
      email: "a@b.com",
      password: "pass123",
    })
  })

  it("register throws on auth error", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockSignUpEmail.mockResolvedValue({ error: { message: "User exists" } })
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await expect(result.current.register("T", "a@b.com", "p")).rejects.toThrow(
      "User exists"
    )
  })

  it("logout calls signOut and navigates to /login", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockSignOut.mockResolvedValue({})
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await act(async () => {
      await result.current.logout()
    })
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith("/login")
  })

  it("requestReset calls requestPasswordReset", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockRequestPwReset.mockResolvedValue({})
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await act(async () => {
      await result.current.requestReset("a@b.com")
    })
    expect(mockRequestPwReset).toHaveBeenCalledWith({ email: "a@b.com" })
  })

  it("requestReset throws on error", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockRequestPwReset.mockResolvedValue({ error: { message: "No account" } })
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await expect(result.current.requestReset("a@b.com")).rejects.toThrow(
      "No account"
    )
  })

  it("confirmReset calls resetPassword and navigates to /login", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    mockResetPw.mockResolvedValue({})
    const { useAuth } = await import("../use-auth")
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter })

    await act(async () => {
      await result.current.confirmReset("token123", "newpass")
    })
    expect(mockResetPw).toHaveBeenCalledWith({
      newPassword: "newpass",
      token: "token123",
    })
    expect(mockNavigate).toHaveBeenCalledWith("/login")
  })
})
