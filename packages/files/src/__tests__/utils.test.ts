import { describe, it, expect } from "vitest"

describe("generateId", () => {
  it("generates unique ids", async () => {
    const { generateId } = await import("../utils")
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })
})
