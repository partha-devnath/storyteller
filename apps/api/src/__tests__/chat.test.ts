import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("chat routes (validation gate)", () => {
  it("GET /api/chat returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/chat?project=proj_x")
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/chat returns 401/404 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/chat?project=proj_x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "user", kind: "prompt", content: "hi" }),
      })
    )
    expect([401, 404]).toContain(res.status)
  })

  it("POST /api/chat rejects an invalid body", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/chat?project=proj_x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "bot" }),
      })
    )
    expect([400, 401, 404]).toContain(res.status)
  })
})
