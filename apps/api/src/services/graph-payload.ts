export type GraphNode = {
  id: string
  kind: "epic" | "card"
  title: string
  subtitle: string | null
  isClosed: boolean
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
      kind: "epic",
      title: epic.name,
      subtitle: null,
      isClosed: false,
      priority: null,
      epicId: null,
      childCount: cards.filter((card) => card.epicId === epic.id).length,
    })
  }
  for (const card of cards) {
    nodes.push({
      id: card.id,
      kind: "card",
      title: card.title,
      subtitle: null,
      isClosed: card.isClosed,
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
