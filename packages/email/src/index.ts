import nodemailer from "nodemailer"

type SendEmailParams = {
  email: string
  url: string
}

export type EmailSender = {
  sendVerificationEmail: (params: SendEmailParams) => Promise<void>
  sendResetPasswordEmail: (params: SendEmailParams) => Promise<void>
}

const consoleSender: EmailSender = {
  sendVerificationEmail: async ({ email, url }) => {
    console.log(`[EMAIL] Verification to ${email}: ${url}`)
  },
  sendResetPasswordEmail: async ({ email, url }) => {
    console.log(`[EMAIL] Reset password to ${email}: ${url}`)
  },
}

function createMailpitSender(): EmailSender {
  const host = process.env.MAILPIT_HOST ?? "localhost"
  const port = Number(process.env.MAILPIT_SMTP_PORT ?? 1025)
  const transport = nodemailer.createTransport({ host, port, secure: false })
  const from = process.env.EMAIL_FROM ?? "noreply@localhost"

  return {
    async sendVerificationEmail({ email, url }) {
      await transport.sendMail({
        from,
        to: email,
        subject: "Verify your email",
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      })
    },
    async sendResetPasswordEmail({ email, url }) {
      await transport.sendMail({
        from,
        to: email,
        subject: "Reset your password",
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      })
    },
  }
}

function createResendSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? "noreply@localhost"

  if (!apiKey) {
    console.warn("[EMAIL] RESEND_API_KEY not set, falling back to console")
    return consoleSender
  }

  return {
    async sendVerificationEmail({ email, url }) {
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from,
        to: email,
        subject: "Verify your email",
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      })
    },
    async sendResetPasswordEmail({ email, url }) {
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from,
        to: email,
        subject: "Reset your password",
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      })
    },
  }
}

const provider = process.env.EMAIL_PROVIDER

export const emailSender: EmailSender =
  provider === "resend"
    ? createResendSender()
    : provider === "mailpit"
      ? createMailpitSender()
      : consoleSender
