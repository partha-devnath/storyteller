import { describe, it, expect } from "vitest"
import { buildGenerateBoardPrompt } from "../prompts/generate-board"
import { buildClarifyingQuestionsPrompt } from "../prompts/clarifying-questions"
import { buildProcessInstructionPrompt } from "../prompts/process-instruction"
import { buildConsistencyReviewPrompt } from "../prompts/consistency-review"
import type { BoardSnapshot } from "../types"

const snapshot: BoardSnapshot = {
  projectId: "proj_1",
  projectSlug: "loyalty",
  columns: ["backlog", "todo", "in_progress", "review", "done"],
  epics: [{ id: "epic_1", name: "Loyalty", order: 0 }],
  cards: [
    {
      id: "card_1",
      title: "Loyalty enrollment flow",
      description: "Users enroll.",
      acceptanceCriteria: ["Enrolls"],
      status: "todo",
      priority: "high",
      isClosed: true,
      slug: "loyalty-enroll",
    },
  ],
  relations: [],
}

describe("buildGenerateBoardPrompt", () => {
  it("returns a system + user message pair", () => {
    const messages = buildGenerateBoardPrompt({ prompt: "Build a loyalty app" })
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe("system")
    expect(messages[1].role).toBe("user")
    expect(messages[1].content).toContain("Build a loyalty app")
  })

  it("includes the board JSON schema hint", () => {
    const [system] = buildGenerateBoardPrompt({ prompt: "x" })
    expect(system.content).toContain("kind")
    expect(system.content).toContain("epics")
  })
})

describe("buildClarifyingQuestionsPrompt", () => {
  it("threads the Q&A context", () => {
    const messages = buildClarifyingQuestionsPrompt({
      question: "Which base?",
      answer: "All users",
      priorAnswers: "Q: scope? A: full",
      prompt: "Build loyalty",
    })
    expect(messages[1].content).toContain("All users")
    expect(messages[1].content).toContain("full")
    expect(messages[1].content).toContain("Build loyalty")
  })
})

describe("buildProcessInstructionPrompt", () => {
  it("forbids updating closed cards", () => {
    const [system] = buildProcessInstructionPrompt({
      instruction: "Change enrollment",
      snapshot,
      semanticMatches: [],
    })
    expect(system.content.toLowerCase()).toContain("never update")
    expect(system.content.toLowerCase()).toContain("closed")
  })

  it("compacts the snapshot with closed flags", () => {
    const [, user] = buildProcessInstructionPrompt({
      instruction: "Add points",
      snapshot,
      semanticMatches: [
        {
          cardId: "card_1",
          title: "Loyalty enrollment flow",
          slug: "loyalty-enroll",
          isClosed: true,
          similarity: 0.9,
        },
      ],
    })
    expect(user.content).toContain("loyalty-enroll")
    expect(user.content).toContain("CLOSED")
    expect(user.content).toContain("Add points")
  })
})

describe("buildConsistencyReviewPrompt", () => {
  it("asks for contradiction/duplicate/conflict flags", () => {
    const [system] = buildConsistencyReviewPrompt({
      snapshot,
      semanticMatches: [],
    })
    expect(system.content.toLowerCase()).toContain("contradiction")
    expect(system.content.toLowerCase()).toContain("duplicate")
  })
})
