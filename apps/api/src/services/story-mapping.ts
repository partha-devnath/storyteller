import type { EpicDraft } from "@workspace/ai"

export type StoryChange = {
  changeType: "create" | "update"
  targetCardId?: string
  newData: {
    title: string
    description: string
    acceptanceCriteria: string[]
    status: string
    priority: string
    epicName?: string
    sections?: Record<string, string>
  }
  epicName?: string
  relationSummary?: {
    type: "dependency" | "hierarchy" | "evolution"
    sourceCardId?: string
    targetCardId?: string
    note: string
  }[]
  conflictFlags?: {
    type: "contradiction" | "duplicate" | "conflict"
    summary: string
  }[]
}

export type ProposalSummary = {
  created: number
  updated: number
  skipped: { title: string; reason: string }[]
}

export function mapStoriesToChanges({
  epics,
  cardSections,
  knownCardIds,
}: {
  epics: EpicDraft[]
  cardSections: { key: string }[]
  knownCardIds: Set<string>
}): { changes: StoryChange[]; skipped: { title: string; reason: string }[] } {
  const changes: StoryChange[] = []
  const skipped: { title: string; reason: string }[] = []

  for (const epic of epics) {
    for (const story of epic.stories) {
      const action = story.action ?? "create"
      const newData = {
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        status: story.suggestedStatus,
        priority: story.priority,
      }

      if (action === "skip") {
        skipped.push({
          title: story.title,
          reason:
            story.conflictFlags?.map((f) => f.summary).join("; ") ??
            "already exists",
        })
        continue
      }

      if (action === "update") {
        if (!story.targetCardId || !knownCardIds.has(story.targetCardId)) {
          skipped.push({
            title: story.title,
            reason: "target card was not found on the board",
          })
          continue
        }
        changes.push({
          changeType: "update",
          targetCardId: story.targetCardId,
          newData: {
            ...newData,
            sections: story.sections,
          },
          relationSummary: story.relationSummary,
          conflictFlags: story.conflictFlags,
        })
        continue
      }

      const sections: Record<string, string> = { ...(story.sections ?? {}) }
      for (const section of cardSections) {
        if (!(section.key in sections)) sections[section.key] = ""
      }
      changes.push({
        changeType: "create",
        epicName: epic.name,
        newData: {
          ...newData,
          epicName: epic.name,
          sections,
        },
      })
    }
  }

  return { changes, skipped }
}

export function buildReplySummaryText(summary: ProposalSummary): string {
  const total = summary.created + summary.updated
  const counts = `${summary.created} new${
    summary.updated > 0 ? `, ${summary.updated} update` : ""
  }`
  const base = `Generated ${total} cards: ${counts}${
    summary.skipped.length > 0 ? `, ${summary.skipped.length} skipped.` : "."
  }`
  if (summary.skipped.length === 0) return base
  const details = summary.skipped
    .map((s) => `"${s.title}" ${s.reason}`)
    .join("\n")
  return `${base}\n${details}`
}
