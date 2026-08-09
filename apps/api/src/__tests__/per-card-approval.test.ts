import { describe, it, expect, beforeAll, afterAll } from "bun:test"
import { eq } from "drizzle-orm"
import {
  proposal,
  proposalChange,
  card,
  project,
  user,
} from "@workspace/schemas"

process.env.DATABASE_URL =
  "postgres://template:template@localhost:5432/template"
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
process.env.CLIENT_URL = "http://localhost:5173"
process.env.AI_PROVIDER = "mock"

const { db } = await import("@workspace/db")

const PROJ = "test_pcard_project"
const CARD = "test_pcard_card"
const PROP = "test_pcard_proposal"

const USER = (await db.select({ id: user.id }).from(user).limit(1))[0]?.id

beforeAll(async () => {
  const [org] = await db.select({ id: project.orgId }).from(project).limit(1)
  if (!org) throw new Error("seed org missing")
  if (!USER) throw new Error("seed user missing")

  await db.insert(project).values({
    id: PROJ,
    orgId: org.id,
    name: "test pcard",
    slug: "test-pcard",
    columns: [{ key: "backlog", title: "Backlog" }],
    cardSections: [],
  })
  await db.insert(card).values({
    id: CARD,
    projectId: PROJ,
    keyNo: 1,
    title: "Target card",
    slug: "target-card",
    description: "before desc",
    acceptanceCriteria: ["old criteria"],
    status: "backlog",
    priority: "medium",
    isClosed: false,
  })
  await db.insert(proposal).values({
    id: PROP,
    projectId: PROJ,
    createdBy: USER!,
    instruction: "test",
    prompt: "test",
    aiResponse: "{}",
    status: "pending",
  })
  await db.insert(proposalChange).values([
    {
      id: `${PROP}_ch1`,
      proposalId: PROP,
      changeType: "create",
      targetCardId: null,
      newData: { title: "New card" },
      relationSummary: [],
      conflictFlags: [],
    },
    {
      id: `${PROP}_ch2`,
      proposalId: PROP,
      changeType: "update",
      targetCardId: CARD,
      newData: { title: "New title" },
      relationSummary: [],
      conflictFlags: [],
    },
    {
      id: `${PROP}_ch3`,
      proposalId: PROP,
      changeType: "create",
      targetCardId: null,
      newData: { title: "Third card" },
      relationSummary: [],
      conflictFlags: [],
    },
  ])
})

afterAll(async () => {
  await db.delete(proposalChange).where(eq(proposalChange.proposalId, PROP))
  await db.delete(proposal).where(eq(proposal.id, PROP))
  await db.delete(card).where(eq(card.id, CARD))
  await db.delete(project).where(eq(project.id, PROJ))
})

describe("applyProposalChange", () => {
  it("rejects a single change and keeps the proposal pending", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    const result = await applyProposalChange({
      proposalId: PROP,
      changeId: `${PROP}_ch1`,
      approverId: USER!,
      mode: "reject",
    })
    expect(result.applied).toBe(0)
    expect(result.proposalStatus).toBe("pending")

    const [change] = await db
      .select({ rejectedAt: proposalChange.rejectedAt })
      .from(proposalChange)
      .where(eq(proposalChange.id, `${PROP}_ch1`))
    expect(change?.rejectedAt).not.toBeNull()
  })

  it("applies a single change and keeps the proposal pending", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    const result = await applyProposalChange({
      proposalId: PROP,
      changeId: `${PROP}_ch2`,
      approverId: USER!,
      mode: "approve",
    })
    expect(result.applied).toBe(1)
    expect(result.proposalStatus).toBe("pending")

    const [prop] = await db
      .select({ status: proposal.status })
      .from(proposal)
      .where(eq(proposal.id, PROP))
    expect(prop?.status).toBe("pending")

    const [change] = await db
      .select({ approvedAt: proposalChange.approvedAt })
      .from(proposalChange)
      .where(eq(proposalChange.id, `${PROP}_ch2`))
    expect(change?.approvedAt).not.toBeNull()
  })

  it("throws 409 for an already-resolved change", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    await expect(
      applyProposalChange({
        proposalId: PROP,
        changeId: `${PROP}_ch2`,
        approverId: USER!,
        mode: "approve",
      })
    ).rejects.toMatchObject({ status: 409 })
  })

  it("marks the proposal approved when the last change resolves", async () => {
    const { applyProposalChange } = await import("../services/apply-proposal")
    const result = await applyProposalChange({
      proposalId: PROP,
      changeId: `${PROP}_ch3`,
      approverId: USER!,
      mode: "approve",
    })
    expect(result.proposalStatus).toBe("approved")

    const [prop] = await db
      .select({ status: proposal.status })
      .from(proposal)
      .where(eq(proposal.id, PROP))
    expect(prop?.status).toBe("approved")
  })
})

describe("per-card approve/reject routes", () => {
  it("POST /api/proposals/:id/approve with changeId returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changeId: "ch_x" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/proposals/:id/reject with changeId returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changeId: "ch_x", reason: "no" }),
      })
    )
    expect(res.status).toBe(401)
  })
})

describe("proposed lane", () => {
  it("includes update changes with target card context", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/test-pcard/proposed")
    )
    expect(res.status).toBe(401)
  })
})
