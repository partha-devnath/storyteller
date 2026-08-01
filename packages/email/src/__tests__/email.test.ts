import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSendMail = vi.hoisted(() => vi.fn())

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  delete process.env.MAILPIT_HOST
  delete process.env.MAILPIT_SMTP_PORT
  delete process.env.EMAIL_FROM
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_PROVIDER
})

describe("consoleSender", () => {
  it("logs verification email to console", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { emailSender } = await import("../index")
    await emailSender.sendVerificationEmail({
      email: "user@test.com",
      url: "http://example.com/verify",
    })
    expect(logSpy).toHaveBeenCalledWith(
      "[EMAIL] Verification to user@test.com: http://example.com/verify"
    )
    logSpy.mockRestore()
  })

  it("logs reset password email to console", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    const { emailSender } = await import("../index")
    await emailSender.sendResetPasswordEmail({
      email: "user@test.com",
      url: "http://example.com/reset",
    })
    expect(logSpy).toHaveBeenCalledWith(
      "[EMAIL] Reset password to user@test.com: http://example.com/reset"
    )
    logSpy.mockRestore()
  })
})

describe("mailpitSender", () => {
  it("sends email via nodemailer", async () => {
    process.env.EMAIL_PROVIDER = "mailpit"
    process.env.MAILPIT_HOST = "mailpit.test"
    process.env.MAILPIT_SMTP_PORT = "2525"
    process.env.EMAIL_FROM = "noreply@test.com"

    const { emailSender } = await import("../index")
    await emailSender.sendVerificationEmail({
      email: "user@test.com",
      url: "http://example.com/verify",
    })

    expect(mockSendMail).toHaveBeenCalledWith({
      from: "noreply@test.com",
      to: "user@test.com",
      subject: "Verify your email",
      html: '<p>Click <a href="http://example.com/verify">here</a> to verify your email.</p>',
    })
  })

  it("uses defaults when env vars are not set", async () => {
    process.env.EMAIL_PROVIDER = "mailpit"

    const { emailSender } = await import("../index")
    await emailSender.sendResetPasswordEmail({
      email: "user@test.com",
      url: "http://example.com/reset",
    })

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@localhost",
        to: "user@test.com",
        subject: "Reset your password",
      })
    )
  })
})

describe("resendSender", () => {
  it("falls back to console when RESEND_API_KEY is missing", async () => {
    process.env.EMAIL_PROVIDER = "resend"
    const logSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { emailSender } = await import("../index")
    expect(logSpy).toHaveBeenCalledWith(
      "[EMAIL] RESEND_API_KEY not set, falling back to console"
    )
    logSpy.mockRestore()
  })
})

describe("emailSender selection", () => {
  it("uses console sender by default", async () => {
    const { emailSender } = await import("../index")
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    await emailSender.sendVerificationEmail({
      email: "test@test.com",
      url: "http://example.com",
    })
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})
