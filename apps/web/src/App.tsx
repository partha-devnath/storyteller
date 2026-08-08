import { Routes, Route, Navigate } from "react-router"
import { LoginPage } from "@/routes/login"
import { SignupPage } from "@/routes/signup"
import { VerifyEmailPage } from "@/routes/verify-email"
import { ForgotPasswordPage } from "@/routes/forgot-password"
import { ResetPasswordPage } from "@/routes/reset-password"
import { LandingPage } from "@/routes/landing"
import { ProjectsPage } from "@/routes/projects"
import { ProjectChatPage } from "@/routes/project-chat"
import { OrgMembersPage } from "@/routes/org-members"
import { ProjectBoardPage } from "@/routes/project-board"
import { ProposalsPage } from "@/routes/proposals"
import { CardDetailPage } from "@/routes/card-detail"
import { OnboardingPage } from "@/routes/onboarding"
import { BillingPage } from "@/routes/billing"
import { AnalyticsPage } from "@/routes/analytics"
import { ProtectedRoute, PublicRoute } from "@/components/protected-route"
import { AppShell } from "@/components/app-shell"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={<Navigate to="/projects" replace />}
          />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:slug" element={<ProjectBoardPage />} />
          <Route path="/projects/:slug/proposals" element={<ProposalsPage />} />
          <Route path="/projects/:slug/chat" element={<ProjectChatPage />} />
          <Route
            path="/project/:slug/card/:cardSlug"
            element={<CardDetailPage />}
          />
          <Route path="/orgs/:orgId/members" element={<OrgMembersPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/orgs/:orgId/billing" element={<BillingPage />} />
          <Route path="/orgs/:orgId/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
