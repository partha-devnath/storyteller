import { NavLink, useSearchParams } from "react-router"
import { cn } from "@workspace/ui/lib/utils"

function tabClass(active: boolean) {
  return cn(
    "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:text-foreground"
  )
}

export function ProjectTabs({ slug }: { slug: string }) {
  const [searchParams] = useSearchParams()
  const view = searchParams.get("view") ?? "board"
  const boardBase = `/projects/${slug}`
  const graphTo = `${boardBase}?view=graph`

  return (
    <nav className="flex items-center gap-1 border-b bg-background px-4 py-1.5">
      <NavLink
        to={boardBase}
        end
        role="tab"
        className={({ isActive }) => tabClass(isActive && view === "board")}
        aria-current={view === "board" ? "page" : false}
        data-testid="view-switcher-board"
      >
        Board
      </NavLink>
      <NavLink
        to={graphTo}
        role="tab"
        className={({ isActive }) => tabClass(isActive && view === "graph")}
        aria-current={view === "graph" ? "page" : false}
        data-testid="view-switcher-graph"
      >
        Graph
      </NavLink>
      <NavLink
        to={`/projects/${slug}/chat`}
        role="tab"
        className={({ isActive }) => tabClass(isActive)}
      >
        Chat
      </NavLink>
    </nav>
  )
}
