export type GraphNode = {
  id: string
  keyNo: number
  kind: "epic" | "card"
  title: string
  subtitle: string | null
  isClosed: boolean
  isProposed: boolean
  priority: "low" | "medium" | "high" | "critical" | null
  epicId: string | null
  childCount: number
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  type: "dependency" | "hierarchy" | "evolution"
}

export type GraphPayload = { nodes: GraphNode[]; edges: GraphEdge[] }

type EpicInput = { id: string; name: string; parentEpicId: string | null }
type CardInput = {
  id: string
  keyNo: number
  title: string
  epicId: string | null
  isClosed: boolean
  priority: "low" | "medium" | "high" | "critical" | null
}
type RelationInput = {
  id: string
  sourceCardId: string
  targetCardId: string
  type: "dependency" | "hierarchy" | "evolution"
}

export function buildGraphPayload(
  epics: EpicInput[],
  cards: CardInput[],
  relations: RelationInput[]
): GraphPayload {
  const epicIds = new Set(epics.map((epic) => epic.id))

  const nodes: GraphNode[] = []
  for (const epic of epics) {
    nodes.push({
      id: epic.id,
      keyNo: 0,
      kind: "epic",
      title: epic.name,
      subtitle: null,
      isClosed: false,
      isProposed: false,
      priority: null,
      epicId: null,
      childCount: cards.filter((card) => card.epicId === epic.id).length,
    })
  }
  for (const card of cards) {
    nodes.push({
      id: card.id,
      keyNo: card.keyNo,
      kind: "card",
      title: card.title,
      subtitle: null,
      isClosed: card.isClosed,
      isProposed: false,
      priority: card.priority,
      epicId: card.epicId,
      childCount: 0,
    })
  }

  const edgeMap = new Map<string, GraphEdge>()

  // Containment hierarchy edges: card -> its epic
  for (const card of cards) {
    if (!card.epicId) continue
    const id = `${card.epicId}--${card.id}`
    edgeMap.set(id, {
      id,
      source: card.epicId,
      target: card.id,
      type: "hierarchy",
    })
  }
  // Containment hierarchy edges: epic -> its parent epic (same project only)
  for (const epic of epics) {
    if (!epic.parentEpicId || !epicIds.has(epic.parentEpicId)) continue
    const id = `${epic.parentEpicId}--${epic.id}`
    edgeMap.set(id, {
      id,
      source: epic.parentEpicId,
      target: epic.id,
      type: "hierarchy",
    })
  }
  // Relation edges: a relation with the same id as a containment edge wins
  for (const relation of relations) {
    const id = `${relation.sourceCardId}--${relation.targetCardId}`
    edgeMap.set(id, {
      id,
      source: relation.sourceCardId,
      target: relation.targetCardId,
      type: relation.type,
    })
  }

  return { nodes, edges: [...edgeMap.values()] }
}

type ProposalChangeInput = {
  id: string
  changeType: "create" | "update" | "close"
  targetCardId: string | null
  newData: Record<string, unknown>
  relationSummary: {
    type: "dependency" | "hierarchy" | "evolution"
    sourceCardId?: string
    targetCardId?: string
    note: string
  }[]
}

/**
 * Overlays a pending proposal's changes onto the committed graph.
 *
 * - `create` changes become proposed nodes keyed by the change id.
 * - `update` / `close` changes mark their target card as proposed.
 * - relation summaries become proposed edges: endpoints that reference an
 *   existing card resolve to that card; endpoints that are empty resolve to
 *   the create change's own proposed node (the card that would be created).
 */
export function buildProposalGraphPayload(
  base: GraphPayload,
  changes: ProposalChangeInput[]
): GraphPayload {
  const nodes = base.nodes.map((node) => ({ ...node }))
  const nodeIds = new Set(nodes.map((n) => n.id))

  const proposedByChange = new Map<string, string>()

  for (const change of changes) {
    if (change.changeType === "create") {
      const title = String(change.newData.title ?? "New card")
      const epicId = null
      proposedByChange.set(change.id, change.id)
      nodes.push({
        id: change.id,
        keyNo: 0,
        kind: "card",
        title,
        subtitle: "proposed",
        isClosed: false,
        isProposed: true,
        priority: (change.newData.priority as GraphNode["priority"]) ?? null,
        epicId,
        childCount: 0,
      })
      nodeIds.add(change.id)
    } else if (change.targetCardId && nodeIds.has(change.targetCardId)) {
      // mark existing target as proposed (update/close)
      const node = nodes.find((n) => n.id === change.targetCardId)
      if (node) {
        node.isProposed = true
        node.subtitle = change.changeType === "close" ? "close" : "update"
      }
    }
  }

  const edges = new Map(base.edges.map((e) => [e.id, { ...e }]))

  function resolveEndpoint(ref: string | undefined): string | null {
    if (!ref) return null
    if (nodeIds.has(ref)) return ref
    return null
  }

  for (const change of changes) {
    for (const rel of change.relationSummary) {
      let source = resolveEndpoint(rel.sourceCardId)
      let target = resolveEndpoint(rel.targetCardId)

      // Single-endpoint relations point at the card this change creates.
      if (change.changeType === "create" && proposedByChange.has(change.id)) {
        if (!source && target) source = change.id
        else if (source && !target) target = change.id
      }
      // Relations with no resolvable endpoint (e.g. both referencing cards
      // that do not exist yet) still render from/to the proposed node.
      if (change.changeType === "create" && proposedByChange.has(change.id)) {
        if (!source) source = change.id
        if (!target) target = change.id
      }

      if (!source || !target || source === target) continue
      const edgeId = `${source}--${target}`
      if (edges.has(edgeId)) continue
      edges.set(edgeId, {
        id: edgeId,
        source,
        target,
        type: rel.type,
      })
    }
  }

  return { nodes, edges: [...edges.values()] }
}
