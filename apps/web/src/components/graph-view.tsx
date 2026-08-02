import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import dagre from "@dagrejs/dagre"
import type { Node, Edge } from "@xyflow/react"

import "@xyflow/react/dist/style.css"

import { useGraph, type GraphNode, type GraphEdge } from "@/hooks/use-graph"
import { computeImpact } from "@/lib/impact"
import { GraphCanvas } from "./graph-canvas"
import {
  GraphToolbar,
  type EdgeFilterState,
  type EdgeFilterType,
} from "./graph-toolbar"
import type { GraphNodeData } from "./graph-node"
import type { GraphEdgeData } from "./graph-edge"

const NODE_SIZE = {
  epic: { width: 160, height: 64 },
  card: { width: 140, height: 60 },
} as const

function buildLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: Node<GraphNodeData>[]; edges: Edge<GraphEdgeData>[] } {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: "TB", nodesep: 24, ranksep: 48 })

  for (const node of nodes) {
    const size = NODE_SIZE[node.kind]
    graph.setNode(node.id, { width: size.width, height: size.height })
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  const flowNodes: Node<GraphNodeData>[] = nodes.map((node) => {
    const pos = graph.node(node.id)
    const size = NODE_SIZE[node.kind]
    return {
      id: node.id,
      type: "graph",
      position: { x: pos.x - size.width / 2, y: pos.y - size.height / 2 },
      width: size.width,
      height: size.height,
      data: { ...node, isImpacted: false, dimmed: false },
    }
  })

  const flowEdges: Edge<GraphEdgeData>[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "graph",
    data: { ...edge, isImpacted: false, dimmed: false },
  }))

  return { nodes: flowNodes, edges: flowEdges }
}

export function GraphView({
  projectSlug,
  onSelectCard,
}: {
  projectSlug: string
  onSelectCard: (cardId: string) => void
}) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useGraph(projectSlug)

  const [filters, setFilters] = useState<EdgeFilterState>({
    dependency: true,
    hierarchy: true,
    evolution: true,
  })
  const [impactArmed, setImpactArmed] = useState(false)
  const [impactSelectedId, setImpactSelectedId] = useState<string | null>(null)

  const layout = useMemo(() => {
    if (!data)
      return {
        nodes: [] as Node<GraphNodeData>[],
        edges: [] as Edge<GraphEdgeData>[],
      }
    return buildLayout(data.nodes, data.edges)
  }, [data])

  // Client-side edge filtering: drop edges of a toggled-off type, then keep
  // only nodes incident to the remaining edges plus all epic nodes.
  const visible = useMemo(() => {
    const visibleEdges = layout.edges.filter(
      (edge) => filters[edge.data?.type ?? "dependency"]
    )
    const incident = new Set<string>()
    for (const edge of visibleEdges) {
      incident.add(edge.source)
      incident.add(edge.target)
    }
    const visibleNodes = layout.nodes.filter(
      (node) => node.data.kind === "epic" || incident.has(node.id)
    )
    return { nodes: visibleNodes, edges: visibleEdges }
  }, [layout, filters])

  // Impact overlay: mark the selected card + all transitive downstream
  // dependents as impacted (full opacity + ring) and dim the rest.
  const impact = useMemo(() => {
    if (!impactArmed || !impactSelectedId || !data) return null
    return computeImpact(data.nodes, data.edges, impactSelectedId)
  }, [impactArmed, impactSelectedId, data])

  const renderedNodes = useMemo(
    () =>
      visible.nodes.map((node) => {
        const isImpacted = impact?.nodeIds.has(node.id) ?? false
        const dimmed = impact !== null && !isImpacted
        return {
          ...node,
          data: { ...node.data, isImpacted, dimmed },
        }
      }),
    [visible.nodes, impact]
  )

  const renderedEdges = useMemo(
    () =>
      visible.edges.map((edge) => {
        const isImpacted = impact?.edgeIds.has(edge.id) ?? false
        const dimmed = impact !== null && !isImpacted
        return {
          ...edge,
          data: { ...edge.data, isImpacted, dimmed },
        }
      }),
    [visible.edges, impact]
  )

  const impactTitle = useMemo(() => {
    if (!impactSelectedId || !data) return null
    return data.nodes.find((n) => n.id === impactSelectedId)?.title ?? null
  }, [impactSelectedId, data])

  function handleNodeClick(cardId: string) {
    if (impactArmed) {
      setImpactSelectedId(cardId)
    }
    onSelectCard(cardId)
  }

  if (isLoading) {
    return (
      <div
        className="h-64 animate-pulse rounded-lg bg-muted"
        data-testid="graph-loading"
      />
    )
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        <p className="font-semibold text-destructive">
          Couldn't load the graph.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          data-testid="graph-retry"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-lg font-semibold">No cards yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Generate your first story cards from the Chat tab, then view them
          here.
        </p>
        <Button
          className="mt-4"
          data-testid="graph-empty-cta"
          onClick={() => navigate(`/projects/${projectSlug}/chat`)}
        >
          Open Chat
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <GraphToolbar
        filters={filters}
        onToggleFilter={(type: EdgeFilterType) =>
          setFilters((prev) => ({ ...prev, [type]: !prev[type] }))
        }
        impactArmed={impactArmed}
        onToggleImpact={() => {
          setImpactArmed((prev) => !prev)
          setImpactSelectedId(null)
        }}
      />

      {impactArmed && impactTitle && (
        <div
          data-testid="impact-banner"
          className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
        >
          <p>
            Showing impact of{" "}
            <strong className="font-semibold">{impactTitle}</strong>
          </p>
          <Button
            variant="ghost"
            size="sm"
            data-testid="impact-clear"
            onClick={() => setImpactSelectedId(null)}
          >
            Clear
          </Button>
        </div>
      )}

      <GraphCanvas
        nodes={renderedNodes}
        edges={renderedEdges}
        onNodeClick={handleNodeClick}
      />
    </div>
  )
}
