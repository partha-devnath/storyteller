import { describe, it, expect } from "bun:test"
import {
  mapStoriesToChanges,
  buildReplySummaryText,
} from "../services/story-mapping"

const cardSections = [
  { key: "description", label: "Description", description: "", builtIn: true },
  {
    key: "valueAddition",
    label: "Value addition",
    description: "",
    builtIn: false,
  },
]

const epics = [
  {
    name: "Loyalty",
    description: "d",
    order: 0,
    stories: [
      {
        title: "Enroll",
        description: "d",
        acceptanceCriteria: ["c1"],
        priority: "medium" as const,
        suggestedStatus: "backlog" as const,
      },
      {
        title: "Referral program",
        description: "v2",
        acceptanceCriteria: ["c2"],
        priority: "high" as const,
        suggestedStatus: "review" as const,
        action: "update" as const,
        targetCardId: "card_1",
        sections: { valueAddition: "lift" },
        relationSummary: [
          {
            type: "evolution" as const,
            targetCardId: "card_9",
            note: "replaces closed card",
          },
        ],
      },
      {
        title: "Duplicate thing",
        description: "d",
        acceptanceCriteria: [],
        priority: "low" as const,
        suggestedStatus: "backlog" as const,
        action: "skip" as const,
        conflictFlags: [
          { type: "duplicate" as const, summary: "already exists" },
        ],
      },
      {
        title: "Ghost update",
        description: "d",
        acceptanceCriteria: [],
        priority: "low" as const,
        suggestedStatus: "backlog" as const,
        action: "update" as const,
        targetCardId: "card_missing",
      },
    ],
  },
]

describe("mapStoriesToChanges", () => {
  it("maps create, update, and skip stories", () => {
    const { changes, skipped } = mapStoriesToChanges({
      epics,
      cardSections,
      knownCardIds: new Set(["card_1"]),
    })

    expect(changes).toHaveLength(2)
    expect(changes[0]).toMatchObject({
      changeType: "create",
      newData: { title: "Enroll", epicName: "Loyalty" },
    })
    expect(changes[1]).toMatchObject({
      changeType: "update",
      targetCardId: "card_1",
      newData: { title: "Referral program" },
      relationSummary: [
        {
          type: "evolution",
          targetCardId: "card_9",
          note: "replaces closed card",
        },
      ],
    })
    expect(skipped).toHaveLength(2)
    expect(skipped[0]).toMatchObject({
      title: "Duplicate thing",
      reason: "already exists",
    })
    expect(skipped[1]).toMatchObject({ title: "Ghost update" })
  })

  it("completes missing sections with empty strings on create", () => {
    const { changes } = mapStoriesToChanges({
      epics,
      cardSections,
      knownCardIds: new Set(["card_1"]),
    })
    const create = changes[0]
    expect(create.newData.sections).toEqual({
      description: "",
      valueAddition: "",
    })
  })

  it("does not complete sections on update changes", () => {
    const { changes } = mapStoriesToChanges({
      epics,
      cardSections,
      knownCardIds: new Set(["card_1"]),
    })
    const update = changes[1]
    expect(update.newData.sections).toEqual({ valueAddition: "lift" })
  })
})

describe("buildReplySummaryText", () => {
  it("renders the summary line", () => {
    const text = buildReplySummaryText({
      created: 6,
      updated: 1,
      skipped: [{ title: "Loyalty enrollment", reason: "already exists" }],
    })
    expect(text).toContain("Generated 7 cards: 6 new, 1 update, 1 skipped.")
    expect(text).toContain('"Loyalty enrollment" already exists')
  })

  it("renders a no-skip summary", () => {
    const text = buildReplySummaryText({ created: 2, updated: 0, skipped: [] })
    expect(text).toContain("Generated 2 cards: 2 new.")
  })
})
