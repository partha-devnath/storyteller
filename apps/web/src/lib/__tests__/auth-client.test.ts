import { describe, it, expect, vi, beforeEach } from "vitest"

const mockCreateAuthClient = vi.fn(() => ({
  signUp: "signUp_fn",
  signIn: "signIn_fn",
  signOut: "signOut_fn",
  useSession: "useSession_fn",
  sendVerificationEmail: "send_fn",
  requestPasswordReset: "request_fn",
  resetPassword: "reset_fn",
  verifyEmail: "verify_fn",
}))

vi.mock("better-auth/react", () => ({
  createAuthClient: mockCreateAuthClient,
}))

describe("authClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates auth client with default baseURL", async () => {
    const auth = await import("../auth-client")
    expect(mockCreateAuthClient).toHaveBeenCalledWith({
      baseURL: "http://localhost:3001",
    })
    expect(auth.signIn).toBe("signIn_fn")
    expect(auth.signUp).toBe("signUp_fn")
    expect(auth.signOut).toBe("signOut_fn")
    expect(auth.useSession).toBe("useSession_fn")
    expect(auth.verifyEmail).toBe("verify_fn")
    expect(auth.requestPasswordReset).toBe("request_fn")
    expect(auth.resetPassword).toBe("reset_fn")
    expect(auth.sendVerificationEmail).toBe("send_fn")
  })
})
