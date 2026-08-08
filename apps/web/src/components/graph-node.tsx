import type { NodeProps, Node } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"
import { Layers, Lock } from "lucide-react"
import type { GraphNode } from "@/hooks/use-graph"
import { priorityClasses, priorityLabel } from "@/lib/priority"
import { cardKey } from "@/lib/card-key"

export type GraphNodeData = GraphNode & {
  isImpacted?: boolean
  dimmed?: boolean
}

export type GraphFlowNode = Node<GraphNodeData>

export function GraphNodeComponent({
  data,
  selected,
}: NodeProps<GraphFlowNode>) {
  const isEpic = data.kind === "epic"
  const isImpacted = Boolean(data.isImpacted)
  const dimmed = Boolean(data.dimmed)
  const highlighted = isImpacted || selected

  const base = isEpic
    ? "relative w-[160px] rounded-lg border-2 border-primary/40 bg-card px-3 py-2"
    : data.isProposed
      ? "relative w-[140px] rounded-lg border border-warn/60 bg-warn/5 px-3 py-2 shadow-sm"
      : "relative w-[140px] rounded-lg border bg-card px-3 py-2 shadow-sm"

  const stateClasses = [
    !isEpic && data.isClosed
      ? "border-dashed border-destructive/50 opacity-75"
      : "",
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
      data-impact={isImpacted ? "true" : "false"}
      className={`${base} ${stateClasses} cursor-pointer transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !min-h-0 !w-2 !min-w-0 !border-none !bg-transparent !opacity-0"
      />
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
        <div className="flex flex-col gap-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold">
            {data.title}
          </p>
          <div className="flex items-center gap-1.5">
            {data.isProposed ? (
              <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-warn uppercase">
                proposed
              </span>
            ) : (
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                {cardKey(data.keyNo)}
              </span>
            )}
            <span
              className={`size-2 rounded-full border-2 border-background ${
                data.isClosed
                  ? "bg-destructive"
                  : data.isProposed
                    ? "bg-warn"
                    : "bg-primary"
              }`}
            />
            {data.isClosed && <Lock className="size-3 text-muted-foreground" />}
            {data.priority && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  priorityClasses[data.priority] ?? priorityClasses.low
                }`}
              >
                {priorityLabel(data.priority)}
              </span>
            )}
          </div>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !min-h-0 !w-2 !min-w-0 !border-none !bg-transparent !opacity-0"
      />
    </div>
  )
}
