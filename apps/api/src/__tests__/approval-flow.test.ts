import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("AI + proposal + card routes (validation gate)", () => {
  it("POST /api/ai/generate returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/ai/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectSlug: "x", prompt: "build" }),
      })
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/proposals returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals?project=proj_x", {})
    )
    expect([401, 404]).toContain(res.status)
  })

  it("GET /api/proposals/:id returns 401 or 404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/proposals/prop_x?project=proj_x")
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/cards returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: "p",
          title: "X",
          status: "todo",
          priority: "high",
        }),
      })
    )
    expect([401, 404]).toContain(res.status)
  })

  it("GET /api/cards/:id/versions returns 401 or 404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/cards/card_x/versions?project=proj_x")
    )
    expect([401, 404]).toContain(res.status)
  })
})
