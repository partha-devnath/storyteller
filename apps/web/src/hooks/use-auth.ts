import { useNavigate } from "react-router"
import {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} from "@/lib/auth-client"

export function useAuth() {
  const navigate = useNavigate()
  const { data: session, isPending, error } = useSession()

  const login = async (email: string, password: string) => {
    const result = await signIn.email({ email, password })
    if (result.error) throw new Error(result.error.message ?? "Login failed")
    navigate("/dashboard")
    return result
  }

  const register = async (name: string, email: string, password: string) => {
    const result = await signUp.email({ name, email, password })
    if (result.error) throw new Error(result.error.message ?? "Signup failed")
    return result
  }

  const logout = async () => {
    await signOut()
    navigate("/login")
  }

  const requestReset = async (email: string) => {
    const result = await requestPasswordReset({ email })
    if (result.error)
      throw new Error(result.error.message ?? "Failed to send reset email")
    return result
  }

  const confirmReset = async (token: string, newPassword: string) => {
    const result = await resetPassword({ newPassword, token })
    if (result.error)
      throw new Error(result.error.message ?? "Password reset failed")
    navigate("/login")
    return result
  }

  return {
    user: session?.user ?? null,
    session: session ?? null,
    isPending,
    error,
    login,
    register,
    logout,
    requestReset,
    confirmReset,
  }
}
