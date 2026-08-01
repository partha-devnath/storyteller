import { z } from "zod"

export const ROLE_ENUM = z.enum(["owner", "admin", "member", "viewer"])

export const createOrgSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens"
    )
    .optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: ROLE_ENUM,
})

export const acceptInviteSchema = z.object({
  token: z.string().min(8, "Invite token must be at least 8 characters"),
})

export const updateMemberRoleSchema = z.object({
  role: ROLE_ENUM,
})

export type CreateOrgInput = z.infer<typeof createOrgSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
