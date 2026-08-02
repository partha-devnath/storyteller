import { eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { project, epic, card, cardRelation } from "@workspace/schemas"
import { httpError } from "../middleware/org-scope"
import { buildGraphPayload } from "./graph-payload"

export type ExportProject = { id: string; name: string; slug: string }
export type ExportEpic = {
  id: string
  name: string
  parentEpicId: string | null
}
export type ExportCard = {
  id: string
  title: string
  slug: string
  status: string
  priority: "low" | "medium" | "high" | "critical" | null
  isClosed: boolean
  epicId: string | null
  acceptanceCriteria: string[]
}
export type ExportRelation = {
  id: string
  sourceCardId: string
  targetCardId: string
  type: "dependency" | "hierarchy" | "evolution"
}
export type ExportData = {
  project: ExportProject
  epics: ExportEpic[]
  cards: ExportCard[]
  relations: ExportRelation[]
}

export async function buildExportData(projectId: string): Promise<ExportData> {
  const [projectRow] = await db
    .select({
      id: project.id,
      name: project.name,
      slug: project.slug,
    })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  if (!projectRow) throw httpError("Not Found", 404)

  const epics = await db
    .select({
      id: epic.id,
      name: epic.name,
      parentEpicId: epic.parentEpicId,
    })
    .from(epic)
    .where(eq(epic.projectId, projectId))

  const cards = await db
    .select({
      id: card.id,
      title: card.title,
      slug: card.slug,
      status: card.status,
      priority: card.priority,
      isClosed: card.isClosed,
      epicId: card.epicId,
      acceptanceCriteria: card.acceptanceCriteria,
    })
    .from(card)
    .where(eq(card.projectId, projectId))

  const relations = await db
    .select({
      id: cardRelation.id,
      sourceCardId: cardRelation.sourceCardId,
      targetCardId: cardRelation.targetCardId,
      type: cardRelation.type,
    })
    .from(cardRelation)
    .where(eq(cardRelation.projectId, projectId))

  return buildExportDataFromRows({
    project: projectRow,
    epics,
    cards,
    relations,
  })
}

export function buildExportDataFromRows(rows: ExportData): ExportData {
  return rows
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function toCsv(data: ExportData): string {
  const epicNameById = new Map(data.epics.map((e) => [e.id, e.name]))
  const cardTitleById = new Map(data.cards.map((c) => [c.id, c.title]))
  const header =
    "title,slug,status,priority,is_closed,epic,acceptance_criteria,depends_on,hierarchy,evolved_from"

  const rows = data.cards.map((card) => {
    const relationTargets = (type: ExportRelation["type"]): string =>
      data.relations
        .filter((r) => r.sourceCardId === card.id && r.type === type)
        .map((r) => cardTitleById.get(r.targetCardId) ?? r.targetCardId)
        .join("; ")

    const fields = [
      card.title,
      card.slug,
      card.status,
      card.priority ?? "",
      String(card.isClosed),
      card.epicId ? (epicNameById.get(card.epicId) ?? "") : "",
      card.acceptanceCriteria.join("; "),
      relationTargets("dependency"),
      relationTargets("hierarchy"),
      relationTargets("evolution"),
    ]
    return fields.map(csvField).join(",")
  })

  return [header, ...rows].join("\r\n") + "\r\n"
}

export function toJson(data: ExportData): string {
  const payload = buildGraphPayload(data.epics, data.cards, data.relations)
  return JSON.stringify({
    ...payload,
    meta: {
      projectName: data.project.name,
      projectSlug: data.project.slug,
      exportedAt: new Date().toISOString(),
    },
  })
}

function cardLine(card: ExportCard): string {
  const closed = card.isClosed ? " (closed)" : ""
  return `- **${card.title}** (${card.status}, ${card.priority ?? "none"})${closed}`
}

export function toMarkdown(data: ExportData): string {
  const cardTitleById = new Map(data.cards.map((c) => [c.id, c.title]))
  const lines: string[] = [`# ${data.project.name}`, ""]

  for (const epic of data.epics) {
    lines.push(`## ${epic.name}`, "")
    for (const card of data.cards.filter((c) => c.epicId === epic.id)) {
      lines.push(cardLine(card))
    }
    lines.push("")
  }

  const uncategorized = data.cards.filter((c) => !c.epicId)
  if (uncategorized.length > 0) {
    lines.push("## Uncategorized", "")
    for (const card of uncategorized) lines.push(cardLine(card))
    lines.push("")
  }

  if (data.relations.length > 0) {
    lines.push("## Relations", "")
    for (const rel of data.relations) {
      const source = cardTitleById.get(rel.sourceCardId) ?? rel.sourceCardId
      const target = cardTitleById.get(rel.targetCardId) ?? rel.targetCardId
      lines.push(`- ${source} → ${target} (${rel.type})`)
    }
  }

  return lines.join("\n")
}
