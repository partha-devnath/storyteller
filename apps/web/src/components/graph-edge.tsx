import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react"
import type { CSSProperties } from "react"
import type { GraphEdge } from "@/hooks/use-graph"

export type GraphEdgeData = GraphEdge & {
  isImpacted?: boolean
  dimmed?: boolean
}

const edgeStrokeVar: Record<GraphEdge["type"], string> = {
  dependency: "var(--color-edge-dependency)",
  hierarchy: "var(--color-edge-hierarchy)",
  evolution: "var(--color-edge-evolution)",
}

export function GraphEdgeComponent({
  id,
  source,
  target,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps<{ data: GraphEdgeData }>) {
  const edgeType = data?.type ?? "dependency"
  const isImpacted = Boolean(data?.isImpacted)
  const dimmed = Boolean(data?.dimmed)

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 5,
  })

  // React Flow's .react-flow__edge-path rule reads --xy-edge-stroke and
  // --xy-edge-stroke-width, so the type color and thickness are driven from
  // CSS variables set here (idle 1.5, hover 2.5, impacted 3). The group-hover
  // class sets the width var on the path itself, which overrides the inherited
  // value from the group. Impacted edges skip the hover class so 3 wins.
  const groupStyle: CSSProperties = {
    "--xy-edge-stroke": edgeStrokeVar[edgeType],
    "--xy-edge-stroke-width": isImpacted ? 3 : 1.5,
    ...(dimmed ? { opacity: 0.2 } : {}),
  }

  return (
    <g
      data-testid={`graph-edge-${source}--${target}`}
      data-edge-type={edgeType}
      className="group"
      style={groupStyle}
    >
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#arrow-${edgeType})`}
        className={
          isImpacted ? undefined : "group-hover:[--xy-edge-stroke-width:2.5]"
        }
      />
    </g>
  )
}
