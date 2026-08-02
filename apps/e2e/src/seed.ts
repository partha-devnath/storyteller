import { db } from "@workspace/db"
import {
  user as userSchema,
  account as accountSchema,
  organization as organizationSchema,
  organizationMember as organizationMemberSchema,
  project as projectSchema,
  epic as epicSchema,
  card as cardSchema,
  cardVersion as cardVersionSchema,
  cardRelation as cardRelationSchema,
} from "@workspace/schemas"
import { hashPassword } from "@better-auth/utils/password"

export const TEST_USER = {
  email: "e2e@test.com",
  password: "TestPass123!",
  name: "E2E User",
}

export const TEST_USER_B = {
  email: "e2e-b@test.com",
  password: "TestPass123!",
  name: "E2E User B",
}

// Deterministic ids shared between the seed process (prepare-test-db) and the
// Playwright test process — the journeys reference these to build testids
// (graph-node-{id}, mention-option-{userId}) and the API-post URL.
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001"
export const TEST_USER_B_ID = "00000000-0000-4000-8000-000000000002"

// Graph fixture ids (E2E-02 journeys J1/J2/J3)
export const E2E_ORG_ID = "00000000-0000-4000-8000-000000000010"
export const GRAPH_PROJECT_ID = "00000000-0000-4000-8000-000000000011"
export const GRAPH_PROJECT_SLUG = "graph-demo"
export const EPIC_ENROLLMENT_ID = "00000000-0000-4000-8000-000000000020"
export const EPIC_REWARDS_ID = "00000000-0000-4000-8000-000000000021"

export const C1_ID = "00000000-0000-4000-8000-000000000031" // Enrollment form
export const C2_ID = "00000000-0000-4000-8000-000000000032" // Loyalty points ledger
export const C3_ID = "00000000-0000-4000-8000-000000000033" // Rewards catalog
export const C4_ID = "00000000-0000-4000-8000-000000000034" // Redemption flow
export const C5_ID = "00000000-0000-4000-8000-000000000035" // Legacy rewards v1 (closed)

export const GRAPH_FIXTURE = {
  orgId: E2E_ORG_ID,
  projectId: GRAPH_PROJECT_ID,
  projectSlug: GRAPH_PROJECT_SLUG,
  epicEnrollmentId: EPIC_ENROLLMENT_ID,
  epicRewardsId: EPIC_REWARDS_ID,
  cardIds: { C1: C1_ID, C2: C2_ID, C3: C3_ID, C4: C4_ID, C5: C5_ID },
} as const

type CardSeed = {
  id: string
  epicId: string
  title: string
  slug: string
  status: "backlog" | "todo" | "in_progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  isClosed: boolean
}

const CARD_SEEDS: CardSeed[] = [
  {
    id: C1_ID,
    epicId: EPIC_ENROLLMENT_ID,
    title: "Enrollment form",
    slug: "enrollment-form",
    status: "todo",
    priority: "high",
    isClosed: false,
  },
  {
    id: C2_ID,
    epicId: EPIC_ENROLLMENT_ID,
    title: "Loyalty points ledger",
    slug: "loyalty-points-ledger",
    status: "in_progress",
    priority: "high",
    isClosed: false,
  },
  {
    id: C3_ID,
    epicId: EPIC_REWARDS_ID,
    title: "Rewards catalog",
    slug: "rewards-catalog",
    status: "todo",
    priority: "medium",
    isClosed: false,
  },
  {
    id: C4_ID,
    epicId: EPIC_REWARDS_ID,
    title: "Redemption flow",
    slug: "redemption-flow",
    status: "review",
    priority: "high",
    isClosed: false,
  },
  {
    id: C5_ID,
    epicId: EPIC_REWARDS_ID,
    title: "Legacy rewards v1",
    slug: "legacy-rewards-v1",
    status: "done",
    priority: "low",
    isClosed: true,
  },
]

async function insertUser(
  user: { email: string; password: string; name: string },
  userId: string
): Promise<void> {
  const passwordHash = await hashPassword(user.password)
  const now = new Date()

  await db.insert(userSchema).values({
    id: userId,
    name: user.name,
    email: user.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(accountSchema).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  })
}

async function seedGraphFixture(): Promise<void> {
  const now = new Date()

  // Org + owner membership for TEST_USER
  await db.insert(organizationSchema).values({
    id: E2E_ORG_ID,
    name: "E2E Org",
    slug: "e2e-org",
    createdBy: TEST_USER_ID,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(organizationMemberSchema).values({
    id: crypto.randomUUID(),
    orgId: E2E_ORG_ID,
    userId: TEST_USER_ID,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  })

  // Graph Demo project with the standard 5 columns
  await db.insert(projectSchema).values({
    id: GRAPH_PROJECT_ID,
    orgId: E2E_ORG_ID,
    name: "Graph Demo",
    slug: GRAPH_PROJECT_SLUG,
    description: "Seeded E2E graph fixture project",
    columns: [
      { key: "backlog", title: "Backlog" },
      { key: "todo", title: "To Do" },
      { key: "in_progress", title: "In Progress" },
      { key: "review", title: "Review" },
      { key: "done", title: "Done" },
    ],
    customFields: [],
    createdAt: now,
    updatedAt: now,
  })

  // Two epics; E2 (Rewards) is a child of E1 (Enrollment) to exercise the
  // parent-epic hierarchy edge.
  await db.insert(epicSchema).values([
    {
      id: EPIC_ENROLLMENT_ID,
      projectId: GRAPH_PROJECT_ID,
      name: "Enrollment",
      description: "Signup and enrollment flow",
      parentEpicId: null,
      order: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: EPIC_REWARDS_ID,
      projectId: GRAPH_PROJECT_ID,
      name: "Rewards",
      description: "Rewards catalog and redemption",
      parentEpicId: EPIC_ENROLLMENT_ID,
      order: 1,
      createdAt: now,
      updatedAt: now,
    },
  ])

  // Five cards (4 open, 1 closed) with a v1 "create" version each
  for (const card of CARD_SEEDS) {
    await db.insert(cardSchema).values({
      id: card.id,
      projectId: GRAPH_PROJECT_ID,
      epicId: card.epicId,
      title: card.title,
      description: `Seeded E2E fixture card: ${card.title}`,
      acceptanceCriteria: [`${card.title} is implemented`],
      status: card.status,
      priority: card.priority,
      isClosed: card.isClosed,
      closedBy: card.isClosed ? TEST_USER_ID : null,
      closedAt: card.isClosed ? now : null,
      slug: card.slug,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(cardVersionSchema).values({
      id: crypto.randomUUID(),
      cardId: card.id,
      versionNo: 1,
      title: card.title,
      description: `Seeded E2E fixture card: ${card.title}`,
      acceptanceCriteria: [`${card.title} is implemented`],
      status: card.status,
      priority: card.priority,
      changeType: "create",
      createdBy: TEST_USER_ID,
      createdAt: now,
    })
  }

  // Relations: a transitive dependency chain (C3 -> C2, C4 -> C3) so
  // impact(C2) = {C2, C3, C4}; a card-level hierarchy row; an evolution row
  // from the closed C5 to its replacement C3.
  await db.insert(cardRelationSchema).values([
    {
      id: crypto.randomUUID(),
      projectId: GRAPH_PROJECT_ID,
      sourceCardId: C3_ID,
      targetCardId: C2_ID,
      type: "dependency",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId: GRAPH_PROJECT_ID,
      sourceCardId: C4_ID,
      targetCardId: C3_ID,
      type: "dependency",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId: GRAPH_PROJECT_ID,
      sourceCardId: C1_ID,
      targetCardId: C2_ID,
      type: "hierarchy",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId: GRAPH_PROJECT_ID,
      sourceCardId: C5_ID,
      targetCardId: C3_ID,
      type: "evolution",
      createdAt: now,
      updatedAt: now,
    },
  ])
}

export async function seedTestData(): Promise<void> {
  await insertUser(TEST_USER, TEST_USER_ID)
  await insertUser(TEST_USER_B, TEST_USER_B_ID)
  await seedGraphFixture()
}
