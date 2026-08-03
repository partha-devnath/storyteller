import { Hono } from "hono"
import { and, eq } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import {
  organization,
  organizationMember,
  user as userSchema,
} from "@workspace/schemas"
import {
  createOrgSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
} from "@workspace/schemas/validations/org"
import { emailSender } from "@workspace/email"
import { errorHandler } from "../middleware/error-handler"
import { requireOrg } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { validateBody } from "../middleware/validate"
import { httpError } from "../middleware/org-scope"
import { assertLimitTx } from "../services/plan-limits"
import { generateId, slugify } from "../utils"
import type { AppEnv } from "../middleware/env"

export const orgsRoutes = new Hono<AppEnv>()
orgsRoutes.onError(errorHandler)

orgsRoutes.post("/", validateBody(createOrgSchema), async (c) => {
  const body = c.var.body as {
    name: string
    slug?: string
  }
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    throw httpError("Unauthorized", 401)
  }

  const slug = body.slug ?? slugify(body.name)
  const orgId = generateId()
  await db.insert(organization).values({
    id: orgId,
    name: body.name,
    slug,
    createdBy: session.user.id,
  })
  await db.insert(organizationMember).values({
    id: generateId(),
    orgId,
    userId: session.user.id,
    role: "owner",
    inviteStatus: "accepted",
  })

  return c.json(
    {
      success: true,
      data: { org: { id: orgId, name: body.name, slug }, role: "owner" },
    },
    201
  )
})

orgsRoutes.get("/", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    throw httpError("Unauthorized", 401)
  }
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: organizationMember.role,
      createdAt: organization.createdAt,
    })
    .from(organizationMember)
    .innerJoin(organization, eq(organizationMember.orgId, organization.id))
    .where(eq(organizationMember.userId, session.user.id))

  return c.json({ success: true, data: rows })
})

orgsRoutes.post(
  "/:id/invite",
  requireOrg,
  requireRole("owner", "admin"),
  async (c) => {
    const orgId = c.var.orgId
    const inviterId = c.var.userId
    const result = inviteMemberSchema.safeParse(await c.req.json())
    if (!result.success) {
      throw httpError(result.error.issues.map((i) => i.message).join("; "), 400)
    }
    const { email, role } = result.data

    const [existing] = await db
      .select()
      .from(organizationMember)
      .innerJoin(userSchema, eq(organizationMember.userId, userSchema.id))
      .where(
        and(eq(organizationMember.orgId, orgId), eq(userSchema.email, email))
      )
      .limit(1)
    if (existing) {
      throw httpError("Already a member", 409)
    }

    const [inviteeUser] = await db
      .select()
      .from(userSchema)
      .where(eq(userSchema.email, email))
      .limit(1)

    let token = ""
    let inviteId = ""
    await db.transaction(async (tx) => {
      await assertLimitTx(tx, orgId, "members")

      token = crypto.randomUUID()
      inviteId = generateId()
      await tx.insert(organizationMember).values({
        id: inviteId,
        orgId,
        userId: inviteeUser?.id ?? null,
        role,
        invitedEmail: inviteeUser ? null : email,
        inviteToken: token,
        inviteStatus: "pending",
        invitedBy: inviterId,
      })
    })

    const orgRow = await db
      .select()
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1)
    const orgName = orgRow[0]?.name ?? "an organization"
    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173"
    const url = `${clientUrl}/invite?token=${token}`
    await emailSender.sendInviteEmail({ email, url, orgName })

    return c.json({ success: true, data: { inviteId } }, 201)
  }
)

orgsRoutes.post("/invites/accept", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    throw httpError("Unauthorized", 401)
  }
  const result = acceptInviteSchema.safeParse(await c.req.json())
  if (!result.success) {
    throw httpError(result.error.issues.map((i) => i.message).join("; "), 400)
  }
  const { token } = result.data

  const [member] = await db
    .select()
    .from(organizationMember)
    .where(eq(organizationMember.inviteToken, token))
    .limit(1)
  if (!member || member.inviteStatus !== "pending") {
    throw httpError("Invalid or expired invite", 404)
  }
  if (member.userId && member.userId !== session.user.id) {
    throw httpError("Forbidden", 403)
  }

  await db
    .update(organizationMember)
    .set({
      userId: session.user.id,
      inviteStatus: "accepted",
      inviteToken: null,
      updatedAt: new Date(),
    })
    .where(eq(organizationMember.id, member.id))

  return c.json({
    success: true,
    data: { orgId: member.orgId, role: member.role },
  })
})

orgsRoutes.get(
  "/:id/members",
  requireOrg,
  requireRole("owner", "admin", "member"),
  async (c) => {
    const orgId = c.var.orgId
    const rows = await db
      .select({
        id: organizationMember.id,
        userId: userSchema.id,
        email: userSchema.email,
        name: userSchema.name,
        role: organizationMember.role,
        inviteStatus: organizationMember.inviteStatus,
      })
      .from(organizationMember)
      .innerJoin(userSchema, eq(organizationMember.userId, userSchema.id))
      .where(eq(organizationMember.orgId, orgId))

    return c.json({ success: true, data: rows })
  }
)

orgsRoutes.patch(
  "/:id/members/:userId",
  requireOrg,
  requireRole("owner", "admin"),
  async (c) => {
    const orgId = c.var.orgId
    const targetUserId = c.req.param("userId")
    const result = updateMemberRoleSchema.safeParse(await c.req.json())
    if (!result.success) {
      throw httpError(result.error.issues.map((i) => i.message).join("; "), 400)
    }
    const { role } = result.data

    if (targetUserId === c.var.userId) {
      throw httpError("Cannot change your own role", 400)
    }
    if (role === "owner" && c.var.role !== "owner") {
      throw httpError("Only owners can grant owner", 403)
    }

    const [target] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.orgId, orgId),
          eq(organizationMember.userId, targetUserId)
        )
      )
      .limit(1)
    if (!target) {
      throw httpError("Not Found", 404)
    }

    if (target.role === "owner" && role !== "owner") {
      const owners = await db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.orgId, orgId),
            eq(organizationMember.role, "owner")
          )
        )
      if (owners.length <= 1) {
        throw httpError("Cannot demote the last owner", 400)
      }
    }

    await db
      .update(organizationMember)
      .set({ role, updatedAt: new Date() })
      .where(eq(organizationMember.id, target.id))

    return c.json({ success: true, data: { userId: targetUserId, role } })
  }
)

orgsRoutes.delete(
  "/:id/members/:userId",
  requireOrg,
  requireRole("owner", "admin"),
  async (c) => {
    const orgId = c.var.orgId
    const targetUserId = c.req.param("userId")

    const [target] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.orgId, orgId),
          eq(organizationMember.userId, targetUserId)
        )
      )
      .limit(1)
    if (!target) {
      throw httpError("Not Found", 404)
    }

    if (target.role === "owner") {
      const owners = await db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.orgId, orgId),
            eq(organizationMember.role, "owner")
          )
        )
      if (owners.length <= 1) {
        throw httpError("Cannot remove the last owner", 400)
      }
    }

    await db
      .delete(organizationMember)
      .where(eq(organizationMember.id, target.id))

    return c.json({ success: true, data: { removed: targetUserId } })
  }
)
