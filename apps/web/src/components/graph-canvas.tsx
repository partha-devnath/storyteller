import { ReactFlow, Controls, type Node, type Edge } from "@xyflow/react"
import { GraphNodeComponent } from "./graph-node"
import { GraphEdgeComponent } from "./graph-edge"

// Defined outside the component so React Flow does not re-register them on
// every render (stable identity is required for custom node/edge types).
const nodeTypes = { graph: GraphNodeComponent }
const edgeTypes = { graph: GraphEdgeComponent }

export function GraphCanvas({
  nodes,
  edges,
  onNodeClick,
  className,
}: {
  nodes: Node[]
  edges: Edge[]
  onNodeClick: (cardId: string) => void
  className?: string
}) {
  return (
    <div
      data-testid="graph-canvas"
      className={`${className ?? "h-[560px]"} overflow-hidden rounded-2xl border border-border bg-card [background-image:radial-gradient(circle,rgba(142,160,184,0.14)_1px,transparent_1px)] [background-size:26px_26px]`}
    >
      <svg className="absolute size-0" aria-hidden="true">
        <defs>
          <marker
            id="arrow-dependency"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-dependency)" />
          </marker>
          <marker
            id="arrow-hierarchy"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-hierarchy)" />
          </marker>
          <marker
            id="arrow-evolution"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-evolution)" />
          </marker>
        </defs>
      </svg>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 32 }}
        nodesDraggable
        minZoom={0.5}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
        onNodeClick={(_event, node) => {
          if (node.data?.kind === "card") {
            onNodeClick(node.id)
          }
        }}
      >
        <Controls position="bottom-left" />
      </ReactFlow>
    </div>
  )
}
