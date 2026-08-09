import { describe, it, expect } from "vitest"
import { computeImpact } from "../impact"
import type { GraphNode, GraphEdge } from "@/hooks/use-graph"

function node(id: string, kind: "epic" | "card"): GraphNode {
  return {
    id,
    keyNo: 0,
    kind,
    title: id,
    subtitle: null,
    isClosed: false,
    isProposed: false,
    priority: null,
    epicId: null,
    childCount: 0,
  }
}

function edge(
  id: string,
  source: string,
  target: string,
  type: "dependency" | "hierarchy" | "evolution"
): GraphEdge {
  return { id, source, target, type }
}

describe("computeImpact", () => {
  it("returns empty sets for null selection", () => {
    const nodes = [node("A", "card"), node("B", "card")]
    const edges = [edge("A--B", "A", "B", "dependency")]
    const result = computeImpact(nodes, edges, null)
    expect(result.nodeIds.size).toBe(0)
    expect(result.edgeIds.size).toBe(0)
  })

  it("includes the selected node plus its direct dependents", () => {
    // A depends on B: edge A->B (source depends on target)
    const nodes = [node("A", "card"), node("B", "card")]
    const edges = [edge("A--B", "A", "B", "dependency")]
    const result = computeImpact(nodes, edges, "B")
    expect([...result.nodeIds].sort()).toEqual(["A", "B"])
    expect(result.edgeIds.has("A--B")).toBe(true)
  })

  it("traverses transitive dependency chains in reverse", () => {
    // A depends on B depends on C
    const nodes = [node("A", "card"), node("B", "card"), node("C", "card")]
    const edges = [
      edge("A--B", "A", "B", "dependency"),
      edge("B--C", "B", "C", "dependency"),
    ]
    const result = computeImpact(nodes, edges, "C")
    expect([...result.nodeIds].sort()).toEqual(["A", "B", "C"])
    expect(result.edgeIds.has("A--B")).toBe(true)
    expect(result.edgeIds.has("B--C")).toBe(true)
  })

  it("excludes hierarchy edges from traversal", () => {
    // H (epic) contains C via hierarchy; A depends on C
    const nodes = [node("H", "epic"), node("C", "card"), node("A", "card")]
    const edges = [
      edge("H--C", "H", "C", "hierarchy"),
      edge("A--C", "A", "C", "dependency"),
    ]
    const result = computeImpact(nodes, edges, "C")
    // H must NOT be reached via the hierarchy edge
    expect([...result.nodeIds].sort()).toEqual(["A", "C"])
    // ...but the hierarchy edge is still excluded from edgeIds (H not impacted)
    expect(result.edgeIds.has("A--C")).toBe(true)
    expect(result.edgeIds.has("H--C")).toBe(false)
  })

  it("includes hierarchy edges in edgeIds when both endpoints are impacted", () => {
    // C depends on H (synthetic): select H -> C reached via dependency
    const nodes = [node("H", "epic"), node("C", "card")]
    const edges = [
      edge("H--C", "H", "C", "hierarchy"),
      edge("C--H", "C", "H", "dependency"),
    ]
    const result = computeImpact(nodes, edges, "H")
    expect([...result.nodeIds].sort()).toEqual(["C", "H"])
    expect(result.edgeIds.has("H--C")).toBe(true)
  })

  it("excludes evolution edges from traversal but includes them when connected", () => {
    // E1 evolved from E2 (evolution); A depends on E1
    const nodes = [node("E1", "card"), node("E2", "card"), node("A", "card")]
    const edges = [
      edge("E1--E2", "E1", "E2", "evolution"),
      edge("A--E1", "A", "E1", "dependency"),
    ]
    const result = computeImpact(nodes, edges, "E1")
    expect([...result.nodeIds].sort()).toEqual(["A", "E1"])
    expect(result.edgeIds.has("A--E1")).toBe(true)
    expect(result.edgeIds.has("E1--E2")).toBe(false)
  })

  it("returns only the selected node when it has no dependents", () => {
    const nodes = [node("A", "card"), node("B", "card")]
    const edges = [edge("A--B", "A", "B", "dependency")]
    const result = computeImpact(nodes, edges, "A")
    expect([...result.nodeIds].sort()).toEqual(["A"])
    expect(result.edgeIds.size).toBe(0)
  })

  it("exposes convenience array forms", () => {
    const nodes = [node("A", "card"), node("B", "card")]
    const edges = [edge("A--B", "A", "B", "dependency")]
    const result = computeImpact(nodes, edges, "B")
    expect(result.impactedNodeIds.sort()).toEqual(["A", "B"])
    expect(result.impactedEdgeIds.sort()).toEqual(["A--B"])
  })
})
