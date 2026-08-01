import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("orgs routes (DB-free validation)", () => {
  it("GET /api/orgs returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(new Request("http://localhost/api/orgs"))
    expect(res.status).toBe(401)
  })

  it("POST /api/orgs returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Acme" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/orgs returns 400 on invalid body (missing name)", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "acme" }),
      })
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { success: boolean; error: string }
    expect(body.success).toBe(false)
  })

  it("POST /api/orgs/:id/invite returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/org_1/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", role: "member" }),
      })
    )
    expect(res.status).toBe(401)
  })
})
