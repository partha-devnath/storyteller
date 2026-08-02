import type { GraphNode, GraphEdge } from "@/hooks/use-graph"

export type ImpactResult = {
  nodeIds: Set<string>
  edgeIds: Set<string>
  impactedNodeIds: string[]
  impactedEdgeIds: string[]
}

/**
 * Compute the downstream-impact set for a selected node.
 *
 * Edges render source -> target where "source depends on target". Impact(X) is X
 * plus every node transitively reachable by walking dependency edges in the
 * REVERSE direction: start at X, follow edges whose target equals the current
 * node, add their sources, and repeat until no new nodes appear. These are the
 * cards that transitively depend on X ("downstream" as rendered).
 *
 * Hierarchy and evolution edges are NOT traversed for reachability, but ARE
 * included in edgeIds when both their endpoints are in nodeIds.
 */
export function computeImpact(
  _nodes: GraphNode[],
  edges: GraphEdge[],
  selectedId: string | null
): ImpactResult {
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()

  if (selectedId === null) {
    return { nodeIds, edgeIds, impactedNodeIds: [], impactedEdgeIds: [] }
  }

  // Build the reverse-adjacency list over dependency edges only:
  // target -> [sources that depend on it]
  const reverseDeps = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.type !== "dependency") continue
    const sources = reverseDeps.get(edge.target) ?? []
    sources.push(edge.source)
    reverseDeps.set(edge.target, sources)
  }

  // BFS from the selected node following reverse dependency edges
  const queue: string[] = [selectedId]
  nodeIds.add(selectedId)
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const source of reverseDeps.get(current) ?? []) {
      if (nodeIds.has(source)) continue
      nodeIds.add(source)
      queue.push(source)
    }
  }

  // Include any edge whose endpoints are BOTH impacted (any type)
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      edgeIds.add(edge.id)
    }
  }

  return {
    nodeIds,
    edgeIds,
    impactedNodeIds: [...nodeIds],
    impactedEdgeIds: [...edgeIds],
  }
}
