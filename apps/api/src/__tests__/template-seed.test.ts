import { describe, it, expect } from "bun:test"
import {
  PRODUCT_LAUNCH_TEMPLATE,
  buildSeedRows,
} from "../services/template-seed"

const PRIORITIES = ["low", "medium", "high", "critical"]
const STATUSES = ["backlog", "todo", "in_progress", "review", "done"]

describe("PRODUCT_LAUNCH_TEMPLATE", () => {
  it("has exactly 2 epics and 6 stories", () => {
    expect(PRODUCT_LAUNCH_TEMPLATE.epics).toHaveLength(2)
    const stories = PRODUCT_LAUNCH_TEMPLATE.epics.flatMap((e) => e.stories)
    expect(stories).toHaveLength(6)
  })

  it("every story has title, non-empty criteria, and valid enums", () => {
    const stories = PRODUCT_LAUNCH_TEMPLATE.epics.flatMap((e) => e.stories)
    for (const story of stories) {
      expect(story.title.length).toBeGreaterThan(0)
      expect(story.acceptanceCriteria.length).toBeGreaterThanOrEqual(1)
      expect(PRIORITIES).toContain(story.priority)
      expect(STATUSES).toContain(story.suggestedStatus)
    }
  })
})

describe("buildSeedRows", () => {
  const rows = buildSeedRows(PRODUCT_LAUNCH_TEMPLATE, "org_1", "user_1")

  it("builds one project row with a product-launch slug", () => {
    expect(rows.project.orgId).toBe("org_1")
    expect(rows.project.name).toBe("Product launch")
    expect(rows.project.slug.startsWith("product-launch")).toBe(true)
    expect(rows.project.columns).toHaveLength(5)
    expect(rows.project.customFields).toEqual([])
  })

  it("builds 6 cards each referencing a built epic id", () => {
    expect(rows.cards).toHaveLength(6)
    const epicIds = new Set(rows.epics.map((e) => e.id))
    for (const cardRow of rows.cards) {
      expect(epicIds.has(cardRow.epicId)).toBe(true)
      expect(cardRow.projectId).toBe(rows.project.id)
    }
  })

  it("every card has a version with changeType create and versionNo 1", () => {
    const cardIds = new Set(rows.cards.map((c) => c.id))
    expect(rows.versions).toHaveLength(6)
    for (const version of rows.versions) {
      expect(cardIds.has(version.cardId)).toBe(true)
      expect(version.changeType).toBe("create")
      expect(version.versionNo).toBe(1)
      expect(version.createdBy).toBe("user_1")
    }
  })

  it("card slugs are deterministic", () => {
    expect(rows.cards[0].slug).toBe("product-positioning-statement-1")
    expect(rows.cards[1].slug).toBe("pricing-page-2")
  })
})
