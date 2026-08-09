import { describe, it, expect } from "vitest"
import {
  createOrgSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
} from "../validations/org"
import {
  createProjectSchema,
  updateCardSectionsSchema,
  updateProjectColumnsSchema,
  connectColumnSchema,
} from "../validations/project"
import { createCardSchema, updateCardSchema } from "../validations/card"
import { DEFAULT_CARD_SECTIONS } from "../db/project"

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

describe("card section validations", () => {
  const custom = {
    key: "teamSize",
    label: "Team size",
    description: "How many people this requirement affects.",
    builtIn: false,
  }

  function base(sections: unknown[]) {
    return { cardSections: sections }
  }

  it("accepts built-ins plus custom sections", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, custom])
    )
    expect(result.success).toBe(true)
  })

  it("rejects missing built-ins", () => {
    const result = updateCardSectionsSchema.safeParse(base([custom]))
    expect(result.success).toBe(false)
  })

  it("rejects built-ins that are not first", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([custom, ...DEFAULT_CARD_SECTIONS])
    )
    expect(result.success).toBe(false)
  })

  it("rejects a changed built-in entry", () => {
    const tampered = { ...DEFAULT_CARD_SECTIONS[0], label: "Summary" }
    const result = updateCardSectionsSchema.safeParse(
      base([tampered, DEFAULT_CARD_SECTIONS[1]])
    )
    expect(result.success).toBe(false)
  })

  it("rejects a custom section flagged built-in", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, { ...custom, builtIn: true }])
    )
    expect(result.success).toBe(false)
  })

  it("rejects duplicate keys", () => {
    const dup = { ...custom, label: "Team size again" }
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, custom, dup])
    )
    expect(result.success).toBe(false)
  })

  it("rejects non-camelCase keys", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, { ...custom, key: "TeamSize" }])
    )
    expect(result.success).toBe(false)
  })

  it("rejects a label longer than 60 characters", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, { ...custom, label: "x".repeat(61) }])
    )
    expect(result.success).toBe(false)
  })

  it("rejects more than 20 sections", () => {
    const many = Array.from({ length: 19 }, (_, i) => ({
      key: `custom${i + 1}`,
      label: `Custom ${i + 1}`,
      description: "d",
      builtIn: false,
    }))
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, ...many])
    )
    expect(result.success).toBe(false)
  })
})

describe("project columns validations", () => {
  const locked = [
    { key: "backlog", title: "Backlog", locked: true },
    { key: "review", title: "Review", locked: true },
  ]
  const custom = [{ key: "qa", title: "QA", locked: false, integration: null }]

  it("accepts locked columns plus custom columns", () => {
    const result = updateProjectColumnsSchema.safeParse({
      columns: [...locked, ...custom],
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing locked columns", () => {
    const result = updateProjectColumnsSchema.safeParse({ columns: custom })
    expect(result.success).toBe(false)
  })

  it("rejects a changed locked column", () => {
    const result = updateProjectColumnsSchema.safeParse({
      columns: [
        { key: "backlog", title: "Backlog renamed", locked: true },
        { key: "review", title: "Review", locked: true },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects duplicate keys", () => {
    const result = updateProjectColumnsSchema.safeParse({
      columns: [
        ...locked,
        { key: "qa", title: "QA", locked: false },
        { key: "qa", title: "QA2", locked: false },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("rejects more than 12 columns", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      key: `col${i}`,
      title: `Col ${i}`,
      locked: false,
    }))
    const result = updateProjectColumnsSchema.safeParse({
      columns: [...locked, ...many],
    })
    expect(result.success).toBe(false)
  })
})

describe("connect column validations", () => {
  it("accepts a github PAT connection", () => {
    const result = connectColumnSchema.safeParse({
      provider: "github",
      auth: "pat",
      config: { token: "ghp_test" },
      target: "acme/repo",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a github app connection", () => {
    const result = connectColumnSchema.safeParse({
      provider: "github",
      auth: "app",
      config: {
        appId: "12345",
        installationId: "67890",
        privateKey:
          "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----",
      },
      target: "acme/repo",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a github connection without an auth method", () => {
    const result = connectColumnSchema.safeParse({
      provider: "github",
      config: { token: "ghp_test" },
      target: "acme/repo",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a github app connection without a private key", () => {
    const result = connectColumnSchema.safeParse({
      provider: "github",
      auth: "app",
      config: { appId: "12345", installationId: "67890", privateKey: "" },
      target: "acme/repo",
    })
    expect(result.success).toBe(false)
  })
})
