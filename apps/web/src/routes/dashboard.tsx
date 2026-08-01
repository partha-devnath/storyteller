import { Button } from "@workspace/ui/components/button"
import { useAuth } from "@/hooks/use-auth"
import { useUser } from "@/hooks/use-user"
import { useAppStore } from "@/stores/app-store"

export function DashboardPage() {
  const { user, logout } = useAuth()
  const { data: userData, isLoading } = useUser()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <div className="flex min-h-svh flex-col p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <button
            onClick={toggleSidebar}
            className="rounded-lg border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {sidebarOpen ? "Hide" : "Show"} sidebar
          </button>
        </div>
        <Button onClick={logout} variant="outline">
          Sign out
        </Button>
      </div>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading user data...</p>
        ) : (
          <>
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-medium">Session info</h2>
              <pre className="mt-2 text-xs text-muted-foreground">
                {JSON.stringify(
                  { id: user?.id, name: user?.name, email: user?.email },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-medium">API protected route</h2>
              <pre className="mt-2 text-xs text-muted-foreground">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
