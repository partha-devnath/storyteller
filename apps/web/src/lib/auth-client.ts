import { createAuthClient } from "better-auth/react"

export const {
  signUp,
  signIn,
  signOut,
  useSession,
  sendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
})
