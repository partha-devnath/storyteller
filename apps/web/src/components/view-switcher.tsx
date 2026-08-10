import { useSearchParams } from "react-router"
import { cn } from "@workspace/ui/lib/utils"

function tabClass(active: boolean) {
  return cn(
    "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:text-foreground"
  )
}

export function ViewSwitcher() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get("view") ?? "board"

  return (
    <nav
      role="tablist"
      aria-label="Board view"
      className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-1"
    >
      <button
        role="tab"
        aria-selected={view === "board"}
        data-testid="view-switcher-board"
        onClick={() => setSearchParams({ view: "board" }, { replace: true })}
        className={tabClass(view === "board")}
      >
        Board
      </button>
      <button
        role="tab"
        aria-selected={view === "graph"}
        data-testid="view-switcher-graph"
        onClick={() => setSearchParams({ view: "graph" }, { replace: true })}
        className={tabClass(view === "graph")}
      >
        Graph
      </button>
    </nav>
  )
}
