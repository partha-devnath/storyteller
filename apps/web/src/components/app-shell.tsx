import { useEffect } from "react"
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import { useAppStore } from "@/stores/app-store"
import { useBoardStore } from "@/stores/board-store"
import { useAuth } from "@/hooks/use-auth"
import { useOrgs } from "@/hooks/use-orgs"
import { useUsage } from "@/hooks/use-billing"
import { OrgSwitcher } from "./org-switcher"
import { UserMenu } from "./user-menu"
import { EnvIndicator } from "./env-indicator"
import { LimitBanner } from "./limit-banner"
import { ThemeToggle } from "./theme-toggle"
import { ProjectTabs } from "./project-tabs"
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { LayoutGrid } from "lucide-react"

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
    isActive
      ? "bg-muted font-medium"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )

function SidebarContent() {
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <OrgSwitcher />
      <div>
        <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Workspace
        </p>
        <nav className="space-y-1">
          {getWorkspaceNavItems().map((item) => (
            <NavLink key={item.label} to={item.to} className={linkClass}>
              <LayoutGrid className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {getOrgNavItems(selectedOrgId ?? undefined).length > 0 && (
        <div>
          <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Org
          </p>
          <nav className="space-y-1">
            {getOrgNavItems(selectedOrgId ?? undefined).map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={linkClass}
                data-testid={item.testId}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}

export function AppShell() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { slug } = useParams<{ slug: string }>()
  const { data: orgs } = useOrgs()
  const activeOrg = orgs?.find((o) => o.id === selectedOrgId) ?? orgs?.[0]
  const role = activeOrg?.role
  const { isAtLimit } = useUsage(activeOrg?.id)
  const projectsLimited = isAtLimit("projects")

  const inProject = Boolean(slug)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

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
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="rounded-md border border-transparent px-2 py-1 text-sm hover:bg-muted md:hidden"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="font-semibold whitespace-nowrap">Storyteller</span>
            {(activeOrg || inProject) && (
              <span className="truncate text-muted-foreground">
                {activeOrg?.name}
                {inProject && (activeOrg ? " / " : "")}
                {inProject ? slug : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
          <ThemeToggle />
          {user && <UserMenu name={user.name} role={role} onLogout={logout} />}
        </div>
      </header>

      {slug && <ProjectTabs slug={slug} />}

      <LimitBanner orgId={selectedOrgId ?? activeOrg?.id} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r bg-background p-3 md:block">
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              aria-label="Close sidebar"
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-60 border-r bg-background p-3 shadow-lg">
              <SidebarContent />
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
