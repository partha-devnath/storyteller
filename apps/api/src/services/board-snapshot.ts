import { eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { project, epic, card, cardRelation } from "@workspace/schemas"
import { semanticSearch } from "@workspace/vector"
import type {
  LLMProvider,
  BoardSnapshot,
  SemanticMatch,
} from "@workspace/ai/types"

export async function buildBoardSnapshot(
  projectId: string
): Promise<BoardSnapshot> {
  const [projectRow] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)

  if (!projectRow) {
    throw new Error("Project not found")
  }

  const epics = await db
    .select()
    .from(epic)
    .where(eq(epic.projectId, projectId))

  const cards = await db
    .select()
    .from(card)
    .where(eq(card.projectId, projectId))

  const relations = await db
    .select()
    .from(cardRelation)
    .where(eq(cardRelation.projectId, projectId))

  const epicNameById = new Map(epics.map((e) => [e.id, e.name]))

  return {
    projectId,
    projectSlug: projectRow.slug,
    columns: (projectRow.columns ?? []).map((c) => c.key),
    epics: epics.map((e) => ({ id: e.id, name: e.name, order: e.order })),
    cards: cards.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      acceptanceCriteria: c.acceptanceCriteria ?? [],
      status: c.status,
      priority: c.priority,
      isClosed: c.isClosed,
      slug: c.slug,
      epicName: c.epicId ? epicNameById.get(c.epicId) : undefined,
      customFields: c.customFields ?? undefined,
    })),
    relations: relations.map((r) => ({
      sourceCardId: r.sourceCardId,
      targetCardId: r.targetCardId,
      type: r.type,
    })),
  }
}

export async function buildSemanticContext({
  projectId,
  instruction,
  provider,
}: {
  projectId: string
  instruction: string
  provider: LLMProvider
}): Promise<SemanticMatch[]> {
  return semanticSearch({
    projectId,
    query: instruction,
    provider,
    limit: 6,
  })
}
