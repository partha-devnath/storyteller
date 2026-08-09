import { describe, it, expect } from "bun:test"

process.env.DATABASE_URL =
  "postgres://template:template@localhost:5432/template"
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
process.env.CLIENT_URL = "http://localhost:5173"
process.env.AI_PROVIDER = "mock"
process.env.INTEGRATION_SECRET = "test-integration-secret-32-characters!!"

describe("column routes", () => {
  it("PATCH /api/projects/:slug with columns returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/acme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          columns: [
            { key: "backlog", title: "Backlog", locked: true },
            { key: "review", title: "Review", locked: true },
          ],
        }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("POST connect returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/acme/columns/todo/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "github",
          config: { token: "x" },
          target: "acme/repo",
        }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("GET external link returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request(
        "http://localhost/api/cards/card_x/external/link_x?project=acme"
      )
    )
    expect(res.status).toBe(401)
  })
})
