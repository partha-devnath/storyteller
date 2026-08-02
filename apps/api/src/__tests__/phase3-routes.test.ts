import { describe, it, expect, beforeAll } from "bun:test"
import { analyticsRangeSchema } from "@workspace/schemas/validations/billing"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("phase 3 routes (auth gates + range validation)", () => {
  it("GET /api/orgs/x/analytics returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/x/analytics")
    )
    expect(res.status).toBe(401)
  })

  it("POST /api/orgs/x/projects/template returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/orgs/x/projects/template", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: "product-launch" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("analyticsRangeSchema rejects 90d and accepts 30d", () => {
    expect(analyticsRangeSchema.safeParse({ range: "90d" }).success).toBe(false)
    expect(analyticsRangeSchema.safeParse({ range: "30d" }).success).toBe(true)
  })
})
