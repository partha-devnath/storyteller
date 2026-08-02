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
  subscription as subscriptionSchema,
  proposal as proposalSchema,
  comment as commentSchema,
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

// Fresh users for the O1 onboarding journey — zero projects (and zero orgs)
// so the protected-route first-run guard redirects them to /onboarding.
export const TEST_USER_C = {
  email: "e2e-c@test.com",
  password: "TestPass123!",
  name: "E2E User C",
}

export const TEST_USER_D = {
  email: "e2e-d@test.com",
  password: "TestPass123!",
  name: "E2E User D",
}

// Deterministic ids shared between the seed process (prepare-test-db) and the
// Playwright test process — the journeys reference these to build testids
// (graph-node-{id}, mention-option-{userId}) and the API-post URL.
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001"
export const TEST_USER_B_ID = "00000000-0000-4000-8000-000000000002"
export const TEST_USER_C_ID = "00000000-0000-4000-8000-000000000003"
export const TEST_USER_D_ID = "00000000-0000-4000-8000-000000000004"

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

// Phase 3 fixture ids (E2E-03 journeys B1/B2/B3/O1/A1) — deterministic so the
// journeys can build URLs and API calls against known orgs.
export const FREE_ORG_ID = "00000000-0000-4000-8000-000000000050" // over-limit free org (B2)
export const PRO_ORG_ID = "00000000-0000-4000-8000-000000000051" // pro org (B3)

type CardSeed = {
  id: string
  epicId: string | null
  title: string
  slug: string
  status: "backlog" | "todo" | "in_progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  isClosed: boolean
  createdAt?: Date
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

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS)
}

const STANDARD_COLUMNS = [
  { key: "backlog", title: "Backlog" },
  { key: "todo", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "review", title: "Review" },
  { key: "done", title: "Done" },
]

async function insertCard(projectId: string, card: CardSeed): Promise<void> {
  const now = new Date()
  await db.insert(cardSchema).values({
    id: card.id,
    projectId,
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
    createdAt: card.createdAt ?? now,
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
    createdAt: card.createdAt ?? now,
  })
}

/**
 * Phase 3 fixture orgs (E2E-03 journeys B1/B2/B3/O1/A1), seeded AFTER the
 * graph fixture so Phase 1/2 journeys stay green. Runs in the same
 * seedTestData() call — prepare-test-db executes it before the API boots.
 */
export async function seedPhase3Fixtures(): Promise<void> {
  await seedOverLimitOrg()
  await seedProOrg()
  await seedActivityFixture()
  await seedFreshUsers()
}

/** B2: free org at the projects/members/aiActions limits — no subscription row (free-default path). */
async function seedOverLimitOrg(): Promise<void> {
  const now = new Date()

  await db.insert(organizationSchema).values({
    id: FREE_ORG_ID,
    name: "Over Limit Org",
    slug: "over-limit-org",
    createdBy: TEST_USER_ID,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(organizationMemberSchema).values({
    id: crypto.randomUUID(),
    orgId: FREE_ORG_ID,
    userId: TEST_USER_ID,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  })

  // Exactly 5 accepted members (TEST_USER + 4 seeded users) — free members
  // limit is 5, so usage.members === limits.members. The banner still reports
  // "projects" (first metric in LIMIT_METRICS order).
  const memberUsers = [
    {
      id: "00000000-0000-4000-8000-000000000005",
      email: "e2e-overlimit-1@test.com",
      name: "Over Limit Member 1",
    },
    {
      id: "00000000-0000-4000-8000-000000000006",
      email: "e2e-overlimit-2@test.com",
      name: "Over Limit Member 2",
    },
    {
      id: "00000000-0000-4000-8000-000000000007",
      email: "e2e-overlimit-3@test.com",
      name: "Over Limit Member 3",
    },
    {
      id: "00000000-0000-4000-8000-000000000008",
      email: "e2e-overlimit-4@test.com",
      name: "Over Limit Member 4",
    },
  ]
  for (const u of memberUsers) {
    await insertUser(
      { email: u.email, password: TEST_USER.password, name: u.name },
      u.id
    )
    await db.insert(organizationMemberSchema).values({
      id: crypto.randomUUID(),
      orgId: FREE_ORG_ID,
      userId: u.id,
      role: "member",
      createdAt: now,
      updatedAt: now,
    })
  }

  // Exactly 2 projects — free projects limit is 2, so usage.projects === limit
  // and "New board" is disabled (B2).
  const projects = [
    {
      id: "00000000-0000-4000-8000-000000000060",
      name: "Over Limit Board 1",
      slug: "over-limit-board-1",
    },
    {
      id: "00000000-0000-4000-8000-000000000061",
      name: "Over Limit Board 2",
      slug: "over-limit-board-2",
    },
  ]
  for (const p of projects) {
    await db.insert(projectSchema).values({
      id: p.id,
      orgId: FREE_ORG_ID,
      name: p.name,
      slug: p.slug,
      description: "Seeded over-limit org board",
      columns: STANDARD_COLUMNS,
      customFields: [],
      createdAt: now,
      updatedAt: now,
    })
  }

  // 5 cards across the two boards — cards limit is 500, well under.
  const cards: CardSeed[] = [
    {
      id: "00000000-0000-4000-8000-000000000070",
      epicId: null,
      title: "Over limit card 1",
      slug: "over-limit-card-1",
      status: "todo",
      priority: "medium",
      isClosed: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000071",
      epicId: null,
      title: "Over limit card 2",
      slug: "over-limit-card-2",
      status: "todo",
      priority: "medium",
      isClosed: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000072",
      epicId: null,
      title: "Over limit card 3",
      slug: "over-limit-card-3",
      status: "in_progress",
      priority: "high",
      isClosed: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000073",
      epicId: null,
      title: "Over limit card 4",
      slug: "over-limit-card-4",
      status: "review",
      priority: "medium",
      isClosed: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000074",
      epicId: null,
      title: "Over limit card 5",
      slug: "over-limit-card-5",
      status: "done",
      priority: "low",
      isClosed: true,
    },
  ]
  for (let i = 0; i < cards.length; i++) {
    await insertCard(projects[i % 2].id, cards[i])
  }

  // Exactly 50 proposals dated this calendar month — free aiActions limit is
  // 50, so usage.aiActions === limit (each proposal = one AI action).
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )
  for (let i = 0; i < 50; i++) {
    await db.insert(proposalSchema).values({
      id: crypto.randomUUID(),
      projectId: projects[i % 2].id,
      createdBy: TEST_USER_ID,
      instruction: `Seeded over-limit AI action ${i + 1}`,
      prompt: `Generate a story card for fixture action ${i + 1}`,
      aiResponse: `Mock AI response for fixture action ${i + 1}`,
      status: "pending",
      createdAt: monthStart,
      updatedAt: now,
    })
  }

  // Deliberately NO subscription row — an absent row means the free plan
  // default (getOrgPlan free path), which B2 exercises.
}

/** B3: a pro org (subscription row plan "pro", status "active") — one board, 3 cards, no over-limit state. */
async function seedProOrg(): Promise<void> {
  const now = new Date()

  await db.insert(organizationSchema).values({
    id: PRO_ORG_ID,
    name: "Pro Org",
    slug: "pro-org",
    createdBy: TEST_USER_ID,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(organizationMemberSchema).values({
    id: crypto.randomUUID(),
    orgId: PRO_ORG_ID,
    userId: TEST_USER_ID,
    role: "owner",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(subscriptionSchema).values({
    id: crypto.randomUUID(),
    orgId: PRO_ORG_ID,
    plan: "pro",
    status: "active",
    createdAt: now,
    updatedAt: now,
  })

  const projectId = "00000000-0000-4000-8000-000000000062"
  await db.insert(projectSchema).values({
    id: projectId,
    orgId: PRO_ORG_ID,
    name: "Pro Board",
    slug: "pro-board",
    description: "Seeded pro org board",
    columns: STANDARD_COLUMNS,
    customFields: [],
    createdAt: now,
    updatedAt: now,
  })

  const cards: CardSeed[] = [
    {
      id: "00000000-0000-4000-8000-000000000075",
      epicId: null,
      title: "Pro card 1",
      slug: "pro-card-1",
      status: "todo",
      priority: "high",
      isClosed: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000076",
      epicId: null,
      title: "Pro card 2",
      slug: "pro-card-2",
      status: "in_progress",
      priority: "medium",
      isClosed: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000077",
      epicId: null,
      title: "Pro card 3",
      slug: "pro-card-3",
      status: "review",
      priority: "medium",
      isClosed: false,
    },
  ]
  for (const card of cards) {
    await insertCard(projectId, card)
  }
}

/**
 * A1: activity rows inside TEST_USER's default org (E2E_ORG_ID) dated within
 * the last 30 days. The two extra cards live in a SECOND project so the graph
 * fixture (2 epics + 5 cards = 7 nodes) stays untouched — phase-2 J1 asserts
 * the exact node count.
 */
async function seedActivityFixture(): Promise<void> {
  const now = new Date()

  const activityProjectId = "00000000-0000-4000-8000-000000000063"
  await db.insert(projectSchema).values({
    id: activityProjectId,
    orgId: E2E_ORG_ID,
    name: "Activity Project",
    slug: "activity-project",
    description: "Seeded analytics activity fixture",
    columns: STANDARD_COLUMNS,
    customFields: [],
    createdAt: now,
    updatedAt: now,
  })

  // 2 cards created 3 and 10 days ago.
  const activityCards: CardSeed[] = [
    {
      id: "00000000-0000-4000-8000-000000000078",
      epicId: null,
      title: "Activity card 1",
      slug: "activity-card-1",
      status: "todo",
      priority: "medium",
      isClosed: false,
      createdAt: daysAgo(3),
    },
    {
      id: "00000000-0000-4000-8000-000000000079",
      epicId: null,
      title: "Activity card 2",
      slug: "activity-card-2",
      status: "todo",
      priority: "medium",
      isClosed: false,
      createdAt: daysAgo(10),
    },
  ]
  for (const card of activityCards) {
    await insertCard(activityProjectId, card)
  }

  // 2 approved proposals approved 5 and 15 days ago (bucketed by approvedAt).
  const proposals = [
    { createdBy: TEST_USER_ID, approvedAt: daysAgo(5) },
    { createdBy: TEST_USER_B_ID, approvedAt: daysAgo(15) },
  ]
  for (let i = 0; i < proposals.length; i++) {
    const p = proposals[i]
    await db.insert(proposalSchema).values({
      id: crypto.randomUUID(),
      projectId: activityProjectId,
      createdBy: p.createdBy,
      instruction: `Seeded activity proposal ${i + 1}`,
      prompt: `Generate a story card for seeded activity ${i + 1}`,
      aiResponse: `Mock AI response for seeded activity ${i + 1}`,
      status: "approved",
      approvedBy: TEST_USER_ID,
      approvedAt: p.approvedAt,
      createdAt: p.approvedAt,
      updatedAt: now,
    })
  }

  // 3 comments created 2, 8, and 12 days ago on graph cards (org-scoped via
  // the card's project — no mentions so the phase-2 J2 mention assertions are
  // unaffected).
  const comments = [
    { cardId: C1_ID, userId: TEST_USER_ID, createdAt: daysAgo(2) },
    { cardId: C2_ID, userId: TEST_USER_B_ID, createdAt: daysAgo(8) },
    { cardId: C3_ID, userId: TEST_USER_ID, createdAt: daysAgo(12) },
  ]
  for (let i = 0; i < comments.length; i++) {
    const c = comments[i]
    await db.insert(commentSchema).values({
      id: crypto.randomUUID(),
      cardId: c.cardId,
      userId: c.userId,
      body: `Seeded activity comment ${i + 1}`,
      mentions: [],
      createdAt: c.createdAt,
      updatedAt: now,
    })
  }
}

/** O1: fresh credential users with zero orgs and zero projects — the first-run guard sends them to /onboarding. */
async function seedFreshUsers(): Promise<void> {
  await insertUser(TEST_USER_C, TEST_USER_C_ID)
  await insertUser(TEST_USER_D, TEST_USER_D_ID)
}

export async function seedTestData(): Promise<void> {
  await insertUser(TEST_USER, TEST_USER_ID)
  await insertUser(TEST_USER_B, TEST_USER_B_ID)
  await seedGraphFixture()
  await seedPhase3Fixtures()
}
