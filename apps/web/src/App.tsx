import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router"
import { LoginPage } from "@/routes/login"
import { SignupPage } from "@/routes/signup"
import { VerifyEmailPage } from "@/routes/verify-email"
import { ForgotPasswordPage } from "@/routes/forgot-password"
import { ResetPasswordPage } from "@/routes/reset-password"
import { LandingPage } from "@/routes/landing"
import { ProjectsPage } from "@/routes/projects"
import { ProjectBoardPage } from "@/routes/project-board"
import { ProtectedRoute, PublicRoute } from "@/components/protected-route"
import { AppShell } from "@/components/app-shell"

const CardDetailPage = lazy(() =>
  import("@/routes/card-detail").then((m) => ({ default: m.CardDetailPage }))
)
const ProposalsPage = lazy(() =>
  import("@/routes/proposals").then((m) => ({ default: m.ProposalsPage }))
)
const OrgMembersPage = lazy(() =>
  import("@/routes/org-members").then((m) => ({ default: m.OrgMembersPage }))
)
const ProjectSettingsPage = lazy(() =>
  import("@/routes/project-settings").then((m) => ({
    default: m.ProjectSettingsPage,
  }))
)
const OnboardingPage = lazy(() =>
  import("@/routes/onboarding").then((m) => ({ default: m.OnboardingPage }))
)
const BillingPage = lazy(() =>
  import("@/routes/billing").then((m) => ({ default: m.BillingPage }))
)
const AnalyticsPage = lazy(() =>
  import("@/routes/analytics").then((m) => ({ default: m.AnalyticsPage }))
)

function Suspended({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

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
          <Route
            path="/projects/:slug/proposals"
            element={
              <Suspended>
                <ProposalsPage />
              </Suspended>
            }
          />
          <Route
            path="/projects/:slug/settings"
            element={
              <Suspended>
                <ProjectSettingsPage />
              </Suspended>
            }
          />
          <Route
            path="/project/:slug/card/:cardSlug"
            element={
              <Suspended>
                <CardDetailPage />
              </Suspended>
            }
          />
          <Route
            path="/orgs/:orgId/members"
            element={
              <Suspended>
                <OrgMembersPage />
              </Suspended>
            }
          />
          <Route
            path="/onboarding"
            element={
              <Suspended>
                <OnboardingPage />
              </Suspended>
            }
          />
          <Route
            path="/orgs/:orgId/billing"
            element={
              <Suspended>
                <BillingPage />
              </Suspended>
            }
          />
          <Route
            path="/orgs/:orgId/analytics"
            element={
              <Suspended>
                <AnalyticsPage />
              </Suspended>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}
