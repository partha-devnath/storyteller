import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@workspace/db"
import * as schema from "@workspace/schemas"
import { organization, organizationMember } from "@workspace/schemas"
import { emailSender } from "@workspace/email"
import { createLogger } from "@workspace/logger"

const logger = createLogger("auth")

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001/api/auth",
  trustedOrigins: [process.env.CLIENT_URL ?? "http://localhost:5173"],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const orgId = crypto.randomUUID().split("-").join("").slice(0, 16)
            const orgName = `${user.name ?? "Personal"}'s Workspace`
            const slug = `user-${user.id.slice(0, 8)}`
            await db.insert(organization).values({
              id: orgId,
              name: orgName,
              slug,
              createdBy: user.id,
            })
            await db.insert(organizationMember).values({
              id: crypto.randomUUID().split("-").join("").slice(0, 16),
              orgId,
              userId: user.id,
              role: "owner",
              inviteStatus: "accepted",
            })
            logger.info({ userId: user.id, orgId }, "Personal org created")
          } catch (error) {
            logger.error(error, "Failed to create personal org")
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: true,
    sendResetPassword: async ({
      user,
      token,
    }: {
      user: { id: string; email: string }
      url: string
      token: string
    }) => {
      const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173"
      const redirectUrl = `${clientUrl}/reset-password?token=${token}`
      logger.info({ userId: user.id }, "Sending reset password email")
      await emailSender.sendResetPasswordEmail({
        email: user.email,
        url: redirectUrl,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({
      user,
      token,
    }: {
      user: { id: string; email: string }
      url: string
      token: string
    }) => {
      const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173"
      const redirectUrl = `${clientUrl}/verify-email?token=${token}`
      logger.info({ userId: user.id }, "Sending verification email")
      await emailSender.sendVerificationEmail({
        email: user.email,
        url: redirectUrl,
      })
    },
  },
})
