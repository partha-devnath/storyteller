import { GitBranch, GitFork, Link2, Network } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type EdgeFilterState = {
  dependency: boolean
  hierarchy: boolean
  evolution: boolean
}

export type EdgeFilterType = keyof EdgeFilterState

const FILTERS: {
  key: EdgeFilterType
  label: string
  hint: string
  icon: typeof Link2
  color: string
}[] = [
  {
    key: "dependency",
    label: "Depends on",
    hint: "A requires B",
    icon: Link2,
    color: "bg-edge-dependency",
  },
  {
    key: "hierarchy",
    label: "Contains",
    hint: "epic → card",
    icon: GitBranch,
    color: "bg-edge-hierarchy",
  },
  {
    key: "evolution",
    label: "Replaces",
    hint: "closed → new",
    icon: GitFork,
    color: "bg-edge-evolution",
  },
]

export function GraphToolbar({
  filters,
  onToggleFilter,
  impactArmed,
  onToggleImpact,
}: {
  filters: EdgeFilterState
  onToggleFilter: (type: EdgeFilterType) => void
  impactArmed: boolean
  onToggleImpact: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`edge-filter-${f.key}`}
            onClick={() => onToggleFilter(f.key)}
            title={f.hint}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
              filters[f.key]
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <f.icon className="size-3.5" />
            {f.label}
            <span
              className={cn(
                "size-1.5 rounded-full",
                f.color,
                filters[f.key] ? "" : "opacity-30"
              )}
            />
          </button>
        ))}
      </div>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <button
        data-testid="impact-toggle"
        onClick={onToggleImpact}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
          impactArmed
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Network className="size-3.5" />
        Impact
      </button>

      <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
        {FILTERS.map((f) => (
          <span key={f.key} className="flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", f.color)}
              aria-hidden="true"
            />
            {f.hint}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-destructive bg-destructive/20" />
          closed
        </span>
      </div>

      {impactArmed && (
        <p className="w-full text-xs text-muted-foreground">
          Select a card to see its downstream impact.
        </p>
      )}
    </div>
  )
}
