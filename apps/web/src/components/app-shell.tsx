import { useEffect } from "react"
import { NavLink, Outlet, useLocation, useParams } from "react-router"
import { useAppStore } from "@/stores/app-store"
import { useBoardStore } from "@/stores/board-store"
import { useAuth } from "@/hooks/use-auth"
import { useOrgs } from "@/hooks/use-orgs"
import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"
import { EnvIndicator } from "./env-indicator"
import { LimitBanner } from "./limit-banner"
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"
import { cn } from "@workspace/ui/lib/utils"
import { Bell, Search } from "lucide-react"

const groupClass =
  "px-3 pb-1.5 pt-3 font-mono text-[10.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase"

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    isActive &&
      "border border-border bg-background font-semibold text-foreground"
  )

function SidebarContent({
  name,
  role,
  onLogout,
}: {
  name: string
  role?: "owner" | "admin" | "member" | "viewer"
  onLogout: () => void
}) {
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { data: orgs } = useOrgs()
  const activeOrgId = selectedOrgId ?? orgs?.[0]?.id
  const workspaceItems = getWorkspaceNavItems()
  const orgItems = getOrgNavItems(activeOrgId)

  return (
    <div className="flex h-full flex-col">
      <OrgSwitcher />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        <p className={groupClass}>Workspace</p>
        {workspaceItems.map((item) => (
          <NavLink key={item.label} to={item.to} className={linkClass}>
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-4.5 shrink-0 opacity-80",
                    isActive && "text-primary opacity-100"
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}

        {orgItems.length > 0 && (
          <>
            <p className={cn(groupClass, "pt-4")}>Manage</p>
            {orgItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={linkClass}
                data-testid={item.testId}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "size-4.5 shrink-0 opacity-80",
                        isActive && "text-primary opacity-100"
                      )}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t px-2.5 py-2.5">
        <UserMenu name={name} role={role} onLogout={onLogout} />
      </div>
    </div>
  )
}

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { logout, user } = useAuth()
  const location = useLocation()
  const { slug } = useParams<{ slug: string }>()
  const { data: orgs } = useOrgs()
  const activeOrg = orgs?.find((o) => o.id === selectedOrgId) ?? orgs?.[0]
  const role = activeOrg?.role

  const inProject = Boolean(slug)
  const pageLabel =
    location.pathname === "/projects"
      ? "Boards"
      : inProject
        ? location.pathname.endsWith("/chat")
          ? "Chat"
          : "Board"
        : location.pathname.includes("/members")
          ? "Members"
          : location.pathname.includes("/billing")
            ? "Billing"
            : location.pathname.includes("/analytics")
              ? "Analytics"
              : ""

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-13 shrink-0 items-center gap-4 border-b px-6">
        <button
          onClick={toggleSidebar}
          className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted md:hidden"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <span className="font-bold whitespace-nowrap">Storyteller</span>
          {inProject && (
            <span className="truncate text-muted-foreground">
              {slug}
              {pageLabel && <> · {pageLabel}</>}
            </span>
          )}
        </div>

        <div className="ml-2 flex max-w-md min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-input bg-card px-3 py-2 text-sm focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/25">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label="Global search"
            placeholder="Search cards, keys, versions…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Ctrl K
          </kbd>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            aria-label="Notifications"
            className="relative grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-4.5" />
            <span className="absolute top-2 right-2.5 size-1.5 rounded-full bg-warn" />
          </button>
          <EnvIndicator />
        </div>
      </header>

      <LimitBanner orgId={selectedOrgId ?? activeOrg?.id} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
          <SidebarContent
            name={user?.name ?? ""}
            role={role}
            onLogout={logout}
          />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              aria-label="Close sidebar"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-60 border-r bg-background shadow-lg">
              <SidebarContent
                name={user?.name ?? ""}
                role={role}
                onLogout={logout}
              />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
