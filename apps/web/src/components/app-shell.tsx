import { NavLink, Outlet, useNavigate } from "react-router"
import { useAppStore } from "@/stores/app-store"
import { useBoardStore } from "@/stores/board-store"
import { useAuth } from "@/hooks/use-auth"
import { useOrgs } from "@/hooks/use-orgs"
import { useUsage } from "@/hooks/use-billing"
import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"
import { EnvIndicator } from "./env-indicator"
import { LimitBanner } from "./limit-banner"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { BarChart3, CreditCard } from "lucide-react"

const navItems = [
  { label: "Boards", to: "/projects" },
  { label: "Chat", to: "/projects" },
]

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const { data: orgs } = useOrgs()
  const activeOrg = orgs?.find((o) => o.id === selectedOrgId) ?? orgs?.[0]
  const role = activeOrg?.role
  const { isAtLimit } = useUsage(activeOrg?.id)
  const projectsLimited = isAtLimit("projects")

  const newBoardButton = (
    <Button
      variant="default"
      size="sm"
      disabled={projectsLimited}
      data-testid="new-board"
      onClick={() => navigate("/projects")}
    >
      New board
    </Button>
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-md border border-transparent px-2 py-1 text-sm hover:bg-muted"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <span className="text-sm font-semibold">Storyteller</span>
          {activeOrg && (
            <span className="text-xs text-muted-foreground">
              {activeOrg.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {projectsLimited ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex" data-testid="limit-tooltip" />
                }
              >
                {newBoardButton}
              </TooltipTrigger>
              <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
            </Tooltip>
          ) : (
            newBoardButton
          )}
          <EnvIndicator />
          {user && <UserMenu name={user.name} role={role} onLogout={logout} />}
        </div>
      </header>

      <LimitBanner orgId={selectedOrgId ?? activeOrg?.id} />

      <div className="flex flex-1">
        {sidebarOpen && (
          <aside
            className={cn(
              "w-60 shrink-0 border-r bg-background p-3",
              "hidden md:block"
            )}
          >
            <OrgSwitcher />
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-md px-3 py-2 text-sm",
                      isActive
                        ? "bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {selectedOrgId && (
                <NavLink
                  to={`/orgs/${selectedOrgId}/members`}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-md px-3 py-2 text-sm",
                      isActive
                        ? "bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  Members
                </NavLink>
              )}
              {selectedOrgId && (
                <NavLink
                  to={`/orgs/${selectedOrgId}/billing`}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-md px-3 py-2 text-sm",
                      isActive
                        ? "bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                  data-testid="nav-billing"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="size-4" />
                    Billing
                  </span>
                </NavLink>
              )}
              {selectedOrgId && (
                <NavLink
                  to={`/orgs/${selectedOrgId}/analytics`}
                  className={({ isActive }) =>
                    cn(
                      "block rounded-md px-3 py-2 text-sm",
                      isActive
                        ? "bg-muted font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                  data-testid="nav-analytics"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="size-4" />
                    Analytics
                  </span>
                </NavLink>
              )}
            </nav>
          </aside>
        )}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
