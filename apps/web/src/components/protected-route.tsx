import { Navigate, Outlet, useLocation } from "react-router"
import { useSession } from "@/lib/auth-client"
import { useOnboarding } from "@/hooks/use-onboarding"

export function ProtectedRoute() {
  const { data: session, isPending } = useSession()
  const location = useLocation()
  const onboarding = useOnboarding()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (
    onboarding.checked &&
    onboarding.needsOnboarding &&
    !onboarding.isOnboardingSkipped() &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export function PublicRoute() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
