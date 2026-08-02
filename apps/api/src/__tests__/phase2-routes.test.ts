import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("phase 2 routes (validation gate)", () => {
  it("GET /api/projects/x/graph returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/x/graph")
    )
    expect(res.status).toBe(401)
  })

  it("GET /api/projects/x/events returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/x/events")
    )
    expect(res.status).toBe(401)
  })

  it("GET /api/projects/x/export?format=csv returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/x/export?format=csv")
    )
    expect(res.status).toBe(401)
  })

  it("GET /api/projects/x/export?format=exe returns 400", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/x/export?format=exe")
    )
    expect(res.status).toBe(400)
  })
})
