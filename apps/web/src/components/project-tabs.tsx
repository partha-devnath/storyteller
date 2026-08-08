import { NavLink } from "react-router"
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
  return (
    <nav className="flex items-center gap-1 border-b bg-background px-4 py-1.5">
      <NavLink
        to={`/projects/${slug}/proposals`}
        role="tab"
        className={({ isActive }) => tabClass(isActive)}
      >
        Proposals
      </NavLink>
      <NavLink
        to={`/projects/${slug}`}
        end
        role="tab"
        className={({ isActive }) => tabClass(isActive)}
      >
        Board
      </NavLink>
      <NavLink
        to={`/projects/${slug}/settings`}
        role="tab"
        className={({ isActive }) => tabClass(isActive)}
      >
        Settings
      </NavLink>
    </nav>
  )
}
