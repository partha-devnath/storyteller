import { describe, it, expect } from "vitest"
import { getWorkspaceNavItems, getOrgNavItems } from "@/lib/nav-items"

describe("nav-items", () => {
  it("workspace nav has exactly Boards (Chat is project-scoped)", () => {
    const items = getWorkspaceNavItems()
    expect(items.map((i) => i.label)).toEqual(["Boards"])
    expect(items[0].to).toBe("/projects")
    expect(items[0].icon).toBeDefined()
  })

  it("org nav builds from org id", () => {
    const items = getOrgNavItems("org_1")
    expect(items.map((i) => i.label)).toEqual([
      "Members",
      "Billing",
      "Analytics",
    ])
    expect(items[0].to).toBe("/orgs/org_1/members")
  })

  it("org nav is empty without org id", () => {
    expect(getOrgNavItems(undefined)).toEqual([])
  })
})
