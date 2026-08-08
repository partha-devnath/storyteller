import { describe, it, expect } from "bun:test"
import {
  toCsv,
  toJson,
  toMarkdown,
  type ExportData,
} from "../services/export-data"

const data: ExportData = {
  project: { id: "proj-1", name: "Loyalty Program", slug: "loyalty" },
  epics: [{ id: "epic-1", name: "Core", parentEpicId: null }],
  cards: [
    {
      id: "card-1",
      keyNo: 1,
      title: 'Card, "Quoted"',
      slug: "card-one",
      status: "todo",
      priority: "high",
      isClosed: false,
      epicId: "epic-1",
      acceptanceCriteria: ["AC one", 'AC "two"'],
    },
    {
      id: "card-2",
      keyNo: 2,
      title: "Card Two",
      slug: "card-two",
      status: "done",
      priority: "medium",
      isClosed: true,
      epicId: null,
      acceptanceCriteria: ["line1\nline2"],
    },
  ],
  relations: [
    {
      id: "rel-1",
      sourceCardId: "card-1",
      targetCardId: "card-2",
      type: "dependency",
    },
  ],
}

describe("export-data serializers", () => {
  it("toCsv escapes commas, quotes, and newlines in fields", () => {
    const csv = toCsv(data)
    expect(csv).toContain('"Card, ""Quoted"""')
    expect(csv).toContain('"AC one; AC ""two"""')
    expect(csv).toContain('"line1\nline2"')
    expect(csv.startsWith("title,slug,status,priority,is_closed")).toBe(true)
    expect(csv.endsWith("\r\n")).toBe(true)
  })

  it("toJson round-trips through JSON.parse and contains nodes+edges", () => {
    const json = toJson(data)
    const parsed = JSON.parse(json) as {
      nodes: Array<{ id: string; kind: string }>
      edges: Array<{
        id: string
        source: string
        target: string
        type: string
      }>
      meta: { projectName: string; projectSlug: string }
    }
    expect(Array.isArray(parsed.nodes)).toBe(true)
    expect(Array.isArray(parsed.edges)).toBe(true)
    expect(parsed.nodes).toHaveLength(3) // 1 epic + 2 cards
    expect(parsed.nodes.map((n) => n.id).sort()).toEqual([
      "card-1",
      "card-2",
      "epic-1",
    ])
    expect(parsed.edges).toContainEqual({
      id: "epic-1--card-1",
      source: "epic-1",
      target: "card-1",
      type: "hierarchy",
    })
    expect(parsed.edges).toContainEqual({
      id: "card-1--card-2",
      source: "card-1",
      target: "card-2",
      type: "dependency",
    })
    expect(parsed.meta.projectName).toBe("Loyalty Program")
    expect(parsed.meta.projectSlug).toBe("loyalty")
  })

  it("toMarkdown contains every card title and flags a closed card", () => {
    const md = toMarkdown(data)
    expect(md).toContain("# Loyalty Program")
    expect(md).toContain("## Core")
    expect(md).toContain('**Card, "Quoted"**')
    expect(md).toContain("**Card Two**")
    expect(md).toContain("(closed)")
    expect(md).toContain("## Uncategorized")
    expect(md).toContain('- Card, "Quoted" → Card Two (dependency)')
  })
})
