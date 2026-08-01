import { describe, it, expect } from "vitest"
import {
  createOrgSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
} from "../validations/org"
import { createProjectSchema } from "../validations/project"
import { createCardSchema, updateCardSchema } from "../validations/card"

describe("org validations", () => {
  it("accepts a valid org", () => {
    const result = createOrgSchema.safeParse({
      name: "Acme Corp",
      slug: "acme",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid role on invite", () => {
    const result = inviteMemberSchema.safeParse({
      email: "a@b.com",
      role: "superuser",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a valid invite", () => {
    const result = inviteMemberSchema.safeParse({
      email: "a@b.com",
      role: "member",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a malformed org slug", () => {
    const result = createOrgSchema.safeParse({
      name: "Acme Corp",
      slug: "BAD SLUG",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a short invite token", () => {
    const result = acceptInviteSchema.safeParse({ token: "short" })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown role in updateMemberRole", () => {
    const result = updateMemberRoleSchema.safeParse({ role: "boss" })
    expect(result.success).toBe(false)
  })
})

describe("project validations", () => {
  it("defaults columns when omitted", () => {
    const result = createProjectSchema.safeParse({
      orgId: "org_1",
      name: "Mobile App",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.columns).toHaveLength(5)
      expect(result.data.columns.map((c) => c.key)).toEqual([
        "backlog",
        "todo",
        "in_progress",
        "review",
        "done",
      ])
    }
  })

  it("validates dropdown options", () => {
    const result = createProjectSchema.safeParse({
      orgId: "org_1",
      name: "Mobile App",
      customFields: [
        {
          name: "Team",
          type: "dropdown",
          options: ["A", "B"],
          required: true,
          order: 0,
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid custom field type", () => {
    const result = createProjectSchema.safeParse({
      orgId: "org_1",
      name: "Mobile App",
      customFields: [
        {
          name: "Team",
          type: "checkbox",
          required: false,
          order: 0,
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe("card validations", () => {
  it("accepts a valid minimal card", () => {
    const result = createCardSchema.safeParse({
      projectId: "proj_1",
      title: "A story card",
      status: "todo",
      priority: "high",
    })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid card status", () => {
    const result = createCardSchema.safeParse({
      projectId: "proj_1",
      title: "A story card",
      status: "archived",
      priority: "high",
    })
    expect(result.success).toBe(false)
  })

  it("strictly rejects unknown keys on update", () => {
    const result = updateCardSchema.safeParse({
      title: "Updated",
      isClosed: true,
    })
    expect(result.success).toBe(false)
  })

  it("accepts a valid partial update", () => {
    const result = updateCardSchema.safeParse({ title: "Updated" })
    expect(result.success).toBe(true)
  })
})
