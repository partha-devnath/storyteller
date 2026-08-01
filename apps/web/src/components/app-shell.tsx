import { NavLink, Outlet, useNavigate } from "react-router"
import { useAppStore } from "@/stores/app-store"
import { useBoardStore } from "@/stores/board-store"
import { useAuth } from "@/hooks/use-auth"
import { useOrgs } from "@/hooks/use-orgs"
import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

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
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate("/projects")}
          >
            New board
          </Button>
          {user && <UserMenu name={user.name} role={role} onLogout={logout} />}
        </div>
      </header>

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
