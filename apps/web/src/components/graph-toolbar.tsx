import { GitBranch, GitFork, Link2, Network } from "lucide-react"
import { Toggle } from "@workspace/ui/components/toggle"

export type EdgeFilterState = {
  dependency: boolean
  hierarchy: boolean
  evolution: boolean
}

export type EdgeFilterType = keyof EdgeFilterState

const activeClass =
  "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"

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
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          data-testid="edge-filter-dependency"
          pressed={filters.dependency}
          onPressedChange={() => onToggleFilter("dependency")}
          className={filters.dependency ? activeClass : undefined}
          aria-label="Toggle dependency edges"
        >
          <Link2 />
          Dependency
        </Toggle>
        <Toggle
          data-testid="edge-filter-hierarchy"
          pressed={filters.hierarchy}
          onPressedChange={() => onToggleFilter("hierarchy")}
          className={filters.hierarchy ? activeClass : undefined}
          aria-label="Toggle hierarchy edges"
        >
          <GitBranch />
          Hierarchy
        </Toggle>
        <Toggle
          data-testid="edge-filter-evolution"
          pressed={filters.evolution}
          onPressedChange={() => onToggleFilter("evolution")}
          className={filters.evolution ? activeClass : undefined}
          aria-label="Toggle evolution edges"
        >
          <GitFork />
          Evolution
        </Toggle>

        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <Toggle
          data-testid="impact-toggle"
          pressed={impactArmed}
          onPressedChange={onToggleImpact}
          variant="outline"
          className={impactArmed ? activeClass : undefined}
          aria-label="Arm impact mode"
        >
          <Network />
          Impact
        </Toggle>

        <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-edge-dependency"
              aria-hidden="true"
            />
            Dependency
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-edge-hierarchy"
              aria-hidden="true"
            />
            Hierarchy
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-edge-evolution"
              aria-hidden="true"
            />
            Evolution
          </span>
        </div>
      </div>

      {impactArmed && (
        <p className="mt-2 text-xs text-muted-foreground">
          Select a card to see its downstream impact.
        </p>
      )}
    </div>
  )
}
