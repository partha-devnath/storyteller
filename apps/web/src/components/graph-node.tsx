import type { NodeProps } from "@xyflow/react"
import { Layers, Lock } from "lucide-react"
import type { GraphNode } from "@/hooks/use-graph"
import { priorityClasses } from "./board-card"

export type GraphNodeData = GraphNode & {
  isImpacted?: boolean
  dimmed?: boolean
}

export function GraphNodeComponent({
  data,
  selected,
}: NodeProps<{ data: GraphNodeData }>) {
  const isEpic = data.kind === "epic"
  const isImpacted = Boolean(data.isImpacted)
  const dimmed = Boolean(data.dimmed)
  const highlighted = isImpacted || selected

  const base = isEpic
    ? "w-[160px] rounded-lg border-2 border-foreground/20 bg-card px-3 py-2"
    : "w-[140px] rounded-lg border bg-card px-3 py-2 shadow-sm"

  const stateClasses = [
    !isEpic && data.isClosed ? "border-dashed opacity-60" : "",
    dimmed ? "opacity-25" : "",
    highlighted ? "ring-2 ring-primary border-primary" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${isEpic ? "Epic" : "Card"}: ${data.title}`}
      data-testid={`graph-node-${data.id}`}
      className={`${base} ${stateClasses} cursor-pointer transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
    >
      {isEpic ? (
        <div className="flex items-start gap-1.5">
          <Layers className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm leading-snug font-semibold">
              {data.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.childCount} stories
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">
            {data.title}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {data.isClosed && <Lock className="size-3 text-muted-foreground" />}
            {data.priority && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  priorityClasses[data.priority] ?? priorityClasses.low
                }`}
              >
                {data.priority}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
