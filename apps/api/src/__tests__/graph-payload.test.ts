import { describe, it, expect } from "bun:test"
import {
  buildGraphPayload,
  buildProposalGraphPayload,
} from "../services/graph-payload"

const epics: Array<{ id: string; name: string; parentEpicId: string | null }> =
  [
    { id: "epic-1", name: "Epic One", parentEpicId: null },
    { id: "epic-2", name: "Epic Two", parentEpicId: "epic-1" },
  ]

const cards: Array<{
  id: string
  keyNo: number
  title: string
  slug: string
  status: string
  priority: "low" | "medium" | "high" | "critical"
  isClosed: boolean
  epicId: string | null
}> = [
  {
    id: "card-1",
    keyNo: 1,
    title: "Card One",
    slug: "card-one",
    status: "todo",
    priority: "high",
    isClosed: false,
    epicId: "epic-1",
  },
  {
    id: "card-2",
    keyNo: 2,
    title: "Card Two",
    slug: "card-two",
    status: "done",
    priority: "low",
    isClosed: true,
    epicId: "epic-2",
  },
  {
    id: "card-3",
    keyNo: 3,
    title: "Card Three",
    slug: "card-three",
    status: "backlog",
    priority: "medium",
    isClosed: false,
    epicId: null,
  },
]

const relations: Array<{
  id: string
  projectId: string
  sourceCardId: string
  targetCardId: string
  type: "dependency" | "evolution"
  createdAt: Date
  updatedAt: Date
}> = [
  {
    id: "rel-1",
    projectId: "proj-x",
    sourceCardId: "card-1",
    targetCardId: "card-2",
    type: "dependency",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "rel-2",
    projectId: "proj-x",
    sourceCardId: "card-2",
    targetCardId: "card-3",
    type: "evolution",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe("buildGraphPayload", () => {
  it("maps epics and cards to nodes with correct kinds and counts", () => {
    const { nodes } = buildGraphPayload(epics, cards, relations)
    expect(nodes).toHaveLength(5) // 2 epics + 3 cards
    const epicNodes = nodes.filter((n) => n.kind === "epic")
    const cardNodes = nodes.filter((n) => n.kind === "card")
    expect(epicNodes).toHaveLength(2)
    expect(cardNodes).toHaveLength(3)

    const epicOne = nodes.find((n) => n.id === "epic-1")
    expect(epicOne).toMatchObject({
      kind: "epic",
      title: "Epic One",
      subtitle: null,
      isClosed: false,
      priority: null,
      epicId: null,
      childCount: 1,
    })

    const cardTwo = nodes.find((n) => n.id === "card-2")
    expect(cardTwo).toMatchObject({
      kind: "card",
      title: "Card Two",
      subtitle: null,
      isClosed: true,
      priority: "low",
      epicId: "epic-2",
      childCount: 0,
    })
  })

  it("creates containment hierarchy edges (epic--card)", () => {
    const { edges } = buildGraphPayload(epics, cards, relations)
    expect(edges).toContainEqual({
      id: "epic-1--card-1",
      source: "epic-1",
      target: "card-1",
      type: "hierarchy",
    })
    expect(edges).toContainEqual({
      id: "epic-2--card-2",
      source: "epic-2",
      target: "card-2",
      type: "hierarchy",
    })
  })

  it("creates parent-epic hierarchy edge when parent is in the same list", () => {
    const { edges } = buildGraphPayload(epics, cards, relations)
    expect(edges).toContainEqual({
      id: "epic-1--epic-2",
      source: "epic-1",
      target: "epic-2",
      type: "hierarchy",
    })
  })

  it("passes relation edges through with {src}--{tgt} ids", () => {
    const { edges } = buildGraphPayload(epics, cards, relations)
    expect(edges).toContainEqual({
      id: "card-1--card-2",
      source: "card-1",
      target: "card-2",
      type: "dependency",
    })
    expect(edges).toContainEqual({
      id: "card-2--card-3",
      source: "card-2",
      target: "card-3",
      type: "evolution",
    })
  })

  it("computes childCount per epic", () => {
    const { nodes } = buildGraphPayload(epics, cards, relations)
    const epicOne = nodes.find((n) => n.id === "epic-1")
    const epicTwo = nodes.find((n) => n.id === "epic-2")
    expect(epicOne?.childCount).toBe(1)
    expect(epicTwo?.childCount).toBe(1)
  })
})

describe("buildProposalGraphPayload", () => {
  const base = buildGraphPayload(epics, cards, relations)

  it("adds proposed nodes for create changes", () => {
    const { nodes } = buildProposalGraphPayload(base, [
      {
        id: "ch_new",
        changeType: "create",
        targetCardId: null,
        newData: { title: "New checkout", priority: "high" },
        relationSummary: [],
      },
    ])
    const proposed = nodes.find((n) => n.id === "ch_new")
    expect(proposed).toMatchObject({
      kind: "card",
      title: "New checkout",
      isProposed: true,
      subtitle: "proposed",
    })
  })

  it("connects single-endpoint relations to the proposed node", () => {
    const { nodes, edges } = buildProposalGraphPayload(base, [
      {
        id: "ch_new",
        changeType: "create",
        targetCardId: null,
        newData: { title: "New checkout" },
        relationSummary: [
          {
            type: "evolution",
            sourceCardId: "card-2",
            note: "replaces closed card",
          },
        ],
      },
    ])
    expect(nodes.some((n) => n.id === "ch_new")).toBe(true)
    expect(edges).toContainEqual({
      id: "card-2--ch_new",
      source: "card-2",
      target: "ch_new",
      type: "evolution",
    })
  })

  it("marks update targets as proposed", () => {
    const { nodes } = buildProposalGraphPayload(base, [
      {
        id: "ch_upd",
        changeType: "update",
        targetCardId: "card-1",
        newData: { title: "Card One v2" },
        relationSummary: [],
      },
    ])
    const target = nodes.find((n) => n.id === "card-1")
    expect(target?.isProposed).toBe(true)
  })

  it("carries the base graph through unchanged when no changes", () => {
    const { nodes, edges } = buildProposalGraphPayload(base, [])
    expect(nodes).toHaveLength(base.nodes.length)
    expect(edges).toHaveLength(base.edges.length)
  })
})
