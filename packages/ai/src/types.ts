export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export interface LLMProvider {
  chat(messages: ChatMessage[]): Promise<string>
  embed(texts: string[]): Promise<number[][]>
}

export type CardSnapshot = {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  status: string
  priority: string
  isClosed: boolean
  epicName?: string
  slug: string
  customFields?: Record<string, string>
}

export type EpicSnapshot = {
  id: string
  name: string
  order: number
}

export type RelationSnapshot = {
  sourceCardId: string
  targetCardId: string
  type: "dependency" | "hierarchy" | "evolution"
}

export type BoardSnapshot = {
  projectId: string
  projectSlug: string
  columns: string[]
  epics: EpicSnapshot[]
  cards: CardSnapshot[]
  relations: RelationSnapshot[]
}

export type SemanticMatch = {
  cardId: string
  title: string
  slug: string
  isClosed: boolean
  similarity: number
}

export type RelationSummaryEntry = {
  type: "dependency" | "hierarchy" | "evolution"
  sourceCardId?: string
  targetCardId?: string
  note: string
}

export type ConflictFlag = {
  type: "contradiction" | "duplicate" | "conflict"
  summary: string
}

export type CreateChange = {
  changeType: "create"
  card: {
    title: string
    description: string
    acceptanceCriteria: string[]
    status: string
    priority: string
    epicName?: string
    customFields?: Record<string, string>
    sections?: Record<string, string>
  }
  relationSummary: RelationSummaryEntry[]
  conflictFlags: ConflictFlag[]
}

export type UpdateChange = {
  changeType: "update"
  targetCardId: string
  fields: Partial<{
    title: string
    description: string
    acceptanceCriteria: string[]
    status: string
    priority: string
    customFields: Record<string, string>
    sections: Record<string, string>
  }>
  relationSummary: RelationSummaryEntry[]
  conflictFlags: ConflictFlag[]
}

export type CloseChange = {
  changeType: "close"
  targetCardId: string
  reason: string
  relationSummary: RelationSummaryEntry[]
  conflictFlags: ConflictFlag[]
}

export type ProposalBatch = {
  changes: (CreateChange | UpdateChange | CloseChange)[]
}

export type EpicDraft = {
  name: string
  description: string
  order: number
  stories: {
    title: string
    description: string
    acceptanceCriteria: string[]
    priority: "low" | "medium" | "high" | "critical"
    suggestedStatus: "backlog" | "todo" | "in_progress" | "review" | "done"
  }[]
}

export type ClarifyingQuestion = {
  question: string
  options?: string[]
}

export type GenerateBoardResult =
  | { kind: "board"; epics: EpicDraft[] }
  | { kind: "clarifying"; questions: ClarifyingQuestion[] }
