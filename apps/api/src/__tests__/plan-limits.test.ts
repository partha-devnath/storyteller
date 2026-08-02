import { describe, it, expect, beforeAll } from "bun:test"
import { computeLimitDecision, LimitError } from "../services/plan-limits"
import { PLANS } from "@workspace/schemas"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
})

const FREE_LIMITS: Record<string, number> = {
  projects: 2,
  members: 5,
  aiActions: 50,
  cards: 500,
}

describe("computeLimitDecision (UI-SPEC V2b limits)", () => {
  for (const [metric, limit] of Object.entries(FREE_LIMITS)) {
    it(`free blocks ${metric} at the boundary (usage ${limit}) and allows one under`, () => {
      const blocked = computeLimitDecision("free", metric as never, limit)
      expect(blocked.allowed).toBe(false)
      expect(blocked.limit).toBe(limit)

      const allowed = computeLimitDecision("free", metric as never, limit - 1)
      expect(allowed.allowed).toBe(true)
      expect(allowed.limit).toBe(limit)
    })
  }

  it("free limits match the PLANS config exactly (2/5/50/500)", () => {
    expect(PLANS.free.limits).toEqual({
      projects: 2,
      members: 5,
      aiActions: 50,
      cards: 500,
    })
  })

  it("pro never blocks on null limits (projects, cards)", () => {
    for (const metric of ["projects", "cards"]) {
      const decision = computeLimitDecision("pro", metric as never, 999_999)
      expect(decision.allowed).toBe(true)
      expect(decision.limit).toBeNull()
    }
  })

  it("pro blocks at its numeric limits (members 25, aiActions 5000)", () => {
    expect(computeLimitDecision("pro", "members", 25).allowed).toBe(false)
    expect(computeLimitDecision("pro", "members", 24).allowed).toBe(true)
    expect(computeLimitDecision("pro", "aiActions", 5000).allowed).toBe(false)
    expect(computeLimitDecision("pro", "aiActions", 4999).allowed).toBe(true)
  })

  it("pro limits match the PLANS config exactly (null/25/5000/null)", () => {
    expect(PLANS.pro.limits).toEqual({
      projects: null,
      members: 25,
      aiActions: 5000,
      cards: null,
    })
  })
})

describe("LimitError (402 contract)", () => {
  it("carries status 402 and metric/limit/usage fields", () => {
    const error = new LimitError("projects", 2, 2)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe("Limit reached")
    expect(error.status).toBe(402)
    expect(error.metric).toBe("projects")
    expect(error.limit).toBe(2)
    expect(error.usage).toBe(2)
  })
})
