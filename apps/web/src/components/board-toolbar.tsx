import { Search } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Input } from "@workspace/ui/components/input"
import type { BoardFilters } from "./kanban"

const PRIORITY_OPTIONS = [
  { key: "", label: "All" },
  { key: "critical", label: "P0" },
  { key: "high", label: "P1" },
  { key: "medium", label: "P2" },
  { key: "low", label: "Low" },
]

export function BoardToolbar({
  filters,
  onChange,
}: {
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2">
      <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <Input
          aria-label="Filter cards"
          placeholder="Filter cards by title…"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-input bg-background p-0.5">
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.key || "all"}
            data-testid={
              opt.key ? `filter-priority-${opt.key}` : "filter-priority-all"
            }
            onClick={() => onChange({ ...filters, priority: opt.key })}
            className={cn(
              "rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors",
              filters.priority === opt.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
