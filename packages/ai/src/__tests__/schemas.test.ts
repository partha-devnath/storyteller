import { describe, it, expect } from "vitest"
import {
  generateBoardOutputSchema,
  processInstructionOutputSchema,
  consistencyReviewOutputSchema,
  clarifyingAnswersInputSchema,
} from "../schemas"

const validBoard = {
  kind: "board",
  epics: [
    {
      name: "Loyalty Program",
      description: "Core loyalty features.",
      order: 0,
      stories: [
        {
          title: "Enrollment",
          description: "Users enroll.",
          acceptanceCriteria: ["Enrolls"],
          priority: "high",
          suggestedStatus: "todo",
        },
      ],
    },
  ],
}

const validProcess = {
  changes: [
    {
      change_type: "create",
      card: {
        title: "New card",
        description: "desc",
        acceptanceCriteria: [],
        status: "backlog",
        priority: "medium",
      },
      relation_summary: [],
      conflict_flags: [],
    },
  ],
}

describe("generateBoardOutputSchema", () => {
  it("accepts a valid board", () => {
    expect(generateBoardOutputSchema.safeParse(validBoard).success).toBe(true)
  })

  it("accepts a clarifying variant", () => {
    const result = generateBoardOutputSchema.safeParse({
      kind: "clarifying",
      questions: [{ question: "Which base?" }],
    })
    expect(result.success).toBe(true)
  })

  it("strictly rejects extra keys", () => {
    const result = generateBoardOutputSchema.safeParse({
      ...validBoard,
      extra: "nope",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid priority", () => {
    const bad = JSON.parse(JSON.stringify(validBoard))
    bad.epics[0].stories[0].priority = "urgent"
    expect(generateBoardOutputSchema.safeParse(bad).success).toBe(false)
  })
})

describe("processInstructionOutputSchema", () => {
  it("accepts a valid create change", () => {
    expect(processInstructionOutputSchema.safeParse(validProcess).success).toBe(
      true
    )
  })

  it("rejects an unknown change_type", () => {
    const bad = JSON.parse(JSON.stringify(validProcess))
    bad.changes[0].change_type = "delete"
    expect(processInstructionOutputSchema.safeParse(bad).success).toBe(false)
  })

  it("strictly rejects extra keys on a card", () => {
    const bad = JSON.parse(JSON.stringify(validProcess))
    bad.changes[0].card.isClosed = true
    expect(processInstructionOutputSchema.safeParse(bad).success).toBe(false)
  })
})

describe("consistencyReviewOutputSchema", () => {
  it("accepts a valid review", () => {
    const result = consistencyReviewOutputSchema.safeParse({
      flags: [{ card_id: "c1", type: "duplicate", summary: "duplicate of c2" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid flag type", () => {
    const result = consistencyReviewOutputSchema.safeParse({
      flags: [{ card_id: "c1", type: "blocking", summary: "x" }],
    })
    expect(result.success).toBe(false)
  })
})

describe("clarifyingAnswersInputSchema", () => {
  it("accepts valid answers", () => {
    const result = clarifyingAnswersInputSchema.safeParse({
      answers: [{ question: "Which base?", answer: "All" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty answers", () => {
    const result = clarifyingAnswersInputSchema.safeParse({ answers: [] })
    expect(result.success).toBe(false)
  })
})
