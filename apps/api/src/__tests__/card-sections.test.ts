import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("card sections routes", () => {
  it("PATCH /api/projects/:slug returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/acme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardSections: [] }),
      })
    )
    expect(res.status).toBe(401)
  })
})
