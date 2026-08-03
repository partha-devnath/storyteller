import { db } from "@workspace/db"
import { card, cardVersion, epic, project } from "@workspace/schemas"
import { httpError } from "../middleware/org-scope"
import { generateId, slugify } from "../utils"

export type StoryPriority = "low" | "medium" | "high" | "critical"
export type StoryStatus = "backlog" | "todo" | "in_progress" | "review" | "done"

export type TemplateStory = {
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: StoryPriority
  suggestedStatus: StoryStatus
}

export type TemplateEpic = {
  name: string
  description: string
  stories: TemplateStory[]
}

export type TemplateDefinition = {
  id: "product-launch"
  name: string
  epics: TemplateEpic[]
}

/**
 * Deterministic sample content for the "Sample — Product launch" template
 * (UI-SPEC V3 / onboarding journey O1). Compile-time constant — never
 * user-supplied (T-03-21).
 */
export const PRODUCT_LAUNCH_TEMPLATE: TemplateDefinition = {
  id: "product-launch",
  name: "Product launch",
  epics: [
    {
      name: "Go-to-market",
      description:
        "Positioning, pricing, and social proof to take the product to market.",
      stories: [
        {
          title: "Product positioning statement",
          description:
            "A single-sentence positioning statement that anchors all launch messaging. Define the target customer, the problem, and the differentiator.",
          acceptanceCriteria: [
            "Positioning statement is written as one sentence",
            "Includes target customer, problem, and differentiator",
          ],
          priority: "high",
          suggestedStatus: "todo",
        },
        {
          title: "Pricing page",
          description:
            "A pricing page presenting the chosen tier structure. Include a comparison table and an FAQ for common objections.",
          acceptanceCriteria: [
            "Pricing page lists all tiers with monthly prices",
            "Comparison table highlights the recommended tier",
            "FAQ covers at least three common questions",
          ],
          priority: "high",
          suggestedStatus: "in_progress",
        },
        {
          title: "Customer testimonials",
          description:
            "Collect and publish three short customer testimonials. Ask design partners for permission and a one-line quote.",
          acceptanceCriteria: [
            "At least three testimonials collected",
            "Each testimonial has written permission on file",
          ],
          priority: "medium",
          suggestedStatus: "backlog",
        },
      ],
    },
    {
      name: "Launch operations",
      description:
        "The operational checklist and communications that make launch day repeatable.",
      stories: [
        {
          title: "Launch checklist",
          description:
            "A step-by-step checklist covering the week before, day of, and week after launch. Include owners and deadlines for every step.",
          acceptanceCriteria: [
            "Checklist covers pre-launch, launch day, and post-launch",
            "Every step has an owner and a deadline",
          ],
          priority: "high",
          suggestedStatus: "review",
        },
        {
          title: "Press release draft",
          description:
            "A press release draft announcing the launch. Focus on the problem solved rather than the feature list.",
          acceptanceCriteria: [
            "Draft is ready for editorial review",
            "Announcement focuses on customer problem and outcome",
          ],
          priority: "medium",
          suggestedStatus: "todo",
        },
        {
          title: "Post-launch metrics dashboard",
          description:
            "A dashboard tracking signups, activation, and retention in the first 30 days. Define the metrics before launch so they can be measured from day one.",
          acceptanceCriteria: [
            "Dashboard tracks signups, activation, and retention",
            "Baseline targets set before launch day",
          ],
          priority: "medium",
          suggestedStatus: "backlog",
        },
      ],
    },
  ],
}

export type SeedRows = {
  project: {
    id: string
    orgId: string
    name: string
    slug: string
    description: string | null
    columns: { key: string; title: string }[]
    customFields: []
  }
  epics: Array<{
    id: string
    projectId: string
    name: string
    description: string | null
    order: number
  }>
  cards: Array<{
    id: string
    projectId: string
    epicId: string
    title: string
    description: string
    acceptanceCriteria: string[]
    status: StoryStatus
    priority: StoryPriority
    isClosed: boolean
    slug: string
  }>
  versions: Array<{
    id: string
    cardId: string
    versionNo: number
    title: string
    description: string
    acceptanceCriteria: string[]
    status: StoryStatus
    priority: StoryPriority
    customFields: null
    changeType: "create"
    createdBy: string
  }>
}

/**
 * Pure row builder — returns the exact inserts (project, epics, cards,
 * versions) for a template. DB-free and deterministic (card slugs are
 * derived from story index), so the seeding contract is unit-testable.
 */
export function buildSeedRows(
  template: TemplateDefinition,
  orgId: string,
  userId: string
): SeedRows {
  const projectId = generateId()
  const epics = template.epics.map((epicDef, order) => ({
    id: generateId(),
    projectId,
    name: epicDef.name,
    description: epicDef.description,
    order,
  }))

  const cards: SeedRows["cards"] = []
  const versions: SeedRows["versions"] = []
  let storyIndex = 0
  for (let epicIndex = 0; epicIndex < template.epics.length; epicIndex++) {
    const epicId = epics[epicIndex].id
    for (const story of template.epics[epicIndex].stories) {
      storyIndex += 1
      const cardId = generateId()
      const slug = `${slugify(story.title)}-${storyIndex}`
      cards.push({
        id: cardId,
        projectId,
        epicId,
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        status: story.suggestedStatus,
        priority: story.priority,
        isClosed: false,
        slug,
      })
      versions.push({
        id: generateId(),
        cardId,
        versionNo: 1,
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        status: story.suggestedStatus,
        priority: story.priority,
        customFields: null,
        changeType: "create",
        createdBy: userId,
      })
    }
  }

  return {
    project: {
      id: projectId,
      orgId,
      name: template.name,
      slug: `product-launch-${generateId().slice(0, 6)}`,
      description: null,
      columns: [
        { key: "backlog", title: "Backlog" },
        { key: "todo", title: "To Do" },
        { key: "in_progress", title: "In Progress" },
        { key: "review", title: "Review" },
        { key: "done", title: "Done" },
      ],
      customFields: [],
    },
    epics,
    cards,
    versions,
  }
}

/**
 * Seeds a sample project (2 epics, 6 cards, 6 create versions) from the
 * product-launch template. Atomic via transaction — a failure mid-seed
 * rolls back all inserts. Org/user scoped by the caller's requireOrg +
 * requireRole gates (T-03-22); unknown templateId → 400 (T-03-21).
 */
export async function seedTemplateProject(
  orgId: string,
  userId: string,
  templateId: TemplateDefinition["id"],
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<{ slug: string }> {
  if (templateId !== "product-launch") {
    throw httpError("Unknown template", 400)
  }

  const rows = buildSeedRows(PRODUCT_LAUNCH_TEMPLATE, orgId, userId)
  const seed = async (executor: {
    insert: typeof db.insert
  }): Promise<void> => {
    await executor.insert(project).values({
      id: rows.project.id,
      orgId: rows.project.orgId,
      name: rows.project.name,
      slug: rows.project.slug,
      description: rows.project.description,
      columns: rows.project.columns,
      customFields: rows.project.customFields,
    })
    for (const epicRow of rows.epics) {
      await executor.insert(epic).values(epicRow)
    }
    for (const cardRow of rows.cards) {
      await executor.insert(card).values(cardRow)
    }
    for (const versionRow of rows.versions) {
      await executor.insert(cardVersion).values(versionRow)
    }
  }

  if (tx) {
    await seed(tx)
  } else {
    await db.transaction(seed)
  }

  return { slug: rows.project.slug }
}
