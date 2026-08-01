import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("cards routes (validation gate)", () => {
  it("PATCH /api/cards/:id returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/cards/card_x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New" }),
      })
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/cards/:id/close returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/cards/card_x/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect([401, 404]).toContain(res.status)
  })

  it("GET /api/cards/:id returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/cards/card_x?project=proj_x")
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/cards/:id/comments returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/cards/card_x/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "hi" }),
      })
    )
    expect([401, 404]).toContain(res.status)
  })
})
