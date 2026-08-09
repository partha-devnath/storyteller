import { describe, it, expect, beforeAll, afterAll, vi } from "bun:test"
import { eq } from "drizzle-orm"

process.env.DATABASE_URL =
  "postgres://template:template@localhost:5432/template"
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
process.env.CLIENT_URL = "http://localhost:5173"
process.env.AI_PROVIDER = "mock"
process.env.INTEGRATION_SECRET = "test-integration-secret-32-characters!!"

const { db } = await import("@workspace/db")
const { project, card, integrationCredential } =
  await import("@workspace/schemas")
const { encryptConfig } = await import("../services/credential-crypto")

const PROJ = "test_integ_project"
const CARD = "test_integ_card"

beforeAll(async () => {
  const [existing] = await db
    .select({ id: project.orgId })
    .from(project)
    .limit(1)
  if (!existing) {
    throw new Error("seed: no project row available to source orgId")
  }
  await db.insert(project).values({
    id: PROJ,
    orgId: existing.id,
    name: "test integ",
    slug: "test-integ",
    columns: [
      { key: "backlog", title: "Backlog", locked: true },
      { key: "review", title: "Review", locked: true },
      {
        key: "qa",
        title: "QA",
        locked: false,
        integration: {
          type: "github",
          credentialId: "test_integ_cred",
          target: "acme/repo",
        },
      },
    ],
    cardSections: [],
  })
  await db.insert(integrationCredential).values({
    id: "test_integ_cred",
    projectId: PROJ,
    provider: "github",
    config: encryptConfig({ token: "ghp_test" }),
  })
  await db.insert(card).values({
    id: CARD,
    projectId: PROJ,
    keyNo: 1,
    title: "Test card",
    slug: "test-card",
    description: "Some desc",
    acceptanceCriteria: ["c1", "c2"],
    status: "backlog",
    priority: "medium",
    isClosed: false,
  })
})

afterAll(async () => {
  await db.delete(card).where(eq(card.id, CARD))
  await db
    .delete(integrationCredential)
    .where(eq(integrationCredential.id, "test_integ_cred"))
  await db.delete(project).where(eq(project.id, PROJ))
})

describe("publishCardToColumn", () => {
  it("creates one external ticket per card entry, never twice", async () => {
    const { publishCardToColumn } =
      await import("../services/column-integration")
    const createIssue = vi.fn().mockResolvedValue({
      externalId: "42",
      url: "https://github.com/acme/repo/issues/42",
    })
    const fakeProviders = {
      github: { createIssue, fetchIssue: vi.fn(), fetchRepo: vi.fn() },
      trello: {
        createCard: vi.fn(),
        fetchCard: vi.fn(),
        fetchBoards: vi.fn(),
        fetchLists: vi.fn(),
        fetchList: vi.fn(),
      },
    }

    await publishCardToColumn({
      projectId: PROJ,
      cardId: CARD,
      status: "qa",
      providers: fakeProviders,
    })
    await publishCardToColumn({
      projectId: PROJ,
      cardId: CARD,
      status: "qa",
      providers: fakeProviders,
    })

    expect(createIssue).toHaveBeenCalledTimes(1)
    expect(createIssue).toHaveBeenCalledWith({
      token: "ghp_test",
      repo: "acme/repo",
      title: "Test card",
      body: expect.stringContaining("Acceptance criteria"),
    })
    const [row] = await db
      .select({ links: card.externalLinks })
      .from(card)
      .where(eq(card.id, CARD))
    expect(row?.links).toHaveLength(1)
    expect(row?.links[0].type).toBe("github")
    expect(row?.links[0].credentialId).toBe("test_integ_cred")
  })

  it("does nothing for an unconnected column", async () => {
    const { publishCardToColumn } =
      await import("../services/column-integration")
    const createIssue = vi.fn()
    const fakeProviders = {
      github: { createIssue, fetchIssue: vi.fn(), fetchRepo: vi.fn() },
      trello: {
        createCard: vi.fn(),
        fetchCard: vi.fn(),
        fetchBoards: vi.fn(),
        fetchLists: vi.fn(),
        fetchList: vi.fn(),
      },
    }
    await publishCardToColumn({
      projectId: PROJ,
      cardId: CARD,
      status: "backlog",
      providers: fakeProviders,
    })
    expect(createIssue).not.toHaveBeenCalled()
  })

  it("assertConnectableColumn rejects locked columns", async () => {
    const { assertConnectableColumn } =
      await import("../services/column-integration")
    const columns: { key: string; title: string; locked: boolean }[] = [
      { key: "backlog", title: "Backlog", locked: true },
      { key: "qa", title: "QA", locked: false },
    ]
    expect(() => assertConnectableColumn(columns, "backlog")).toThrow()
  })
})
