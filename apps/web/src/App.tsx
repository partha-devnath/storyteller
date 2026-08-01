import { Routes, Route } from "react-router"
import { LoginPage } from "@/routes/login"
import { SignupPage } from "@/routes/signup"
import { VerifyEmailPage } from "@/routes/verify-email"
import { ForgotPasswordPage } from "@/routes/forgot-password"
import { ResetPasswordPage } from "@/routes/reset-password"
import { DashboardPage } from "@/routes/dashboard"
import { ProtectedRoute, PublicRoute } from "@/components/protected-route"

export function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<LoginPage />} />
    </Routes>
  )
}
