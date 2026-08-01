import { createMiddleware } from "hono/factory"
import { eq, and } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import { organizationMember, project } from "@workspace/schemas"
import type { AppEnv } from "./env"

export function httpError(message: string, status: number) {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  return err
}

async function resolveSession(headers: Headers) {
  return auth.api.getSession({ headers })
}

async function findMembership(orgId: string, userId: string) {
  const [member] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.orgId, orgId),
        eq(organizationMember.userId, userId)
      )
    )
    .limit(1)
  return member
}

export const requireOrg = createMiddleware<AppEnv>(async (c, next) => {
  const session = await resolveSession(c.req.raw.headers)
  if (!session) {
    throw httpError("Unauthorized", 401)
  }

  let orgId = c.req.query("orgId")
  if (!orgId) {
    const method = c.req.method
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      try {
        const body = (await c.req.json()) as { orgId?: string }
        if (body?.orgId) orgId = body.orgId
      } catch {
        // body may not be JSON or already consumed; fall through to param
      }
    }
  }
  if (!orgId) {
    orgId = c.req.param("id")
  }

  if (!orgId) {
    throw httpError("Forbidden", 403)
  }

  const member = await findMembership(orgId, session.user.id)
  if (!member) {
    throw httpError("Forbidden", 403)
  }

  c.set("orgId", member.orgId)
  c.set("role", member.role)
  c.set("userId", session.user.id)
  await next()
})

export const resolveOrgFromProject = createMiddleware<AppEnv>(
  async (c, next) => {
    const session = await resolveSession(c.req.raw.headers)
    if (!session) {
      throw httpError("Unauthorized", 401)
    }

    let projectSlug = c.req.query("project")
    const projectId = c.req.query("projectId")
    if (!projectSlug && !projectId) {
      projectSlug = c.req.param("slug")
    }

    let projectRow: typeof project.$inferSelect | undefined
    if (projectId) {
      const [row] = await db
        .select()
        .from(project)
        .where(eq(project.id, projectId))
        .limit(1)
      projectRow = row
    } else if (projectSlug) {
      const [row] = await db
        .select()
        .from(project)
        .where(eq(project.slug, projectSlug))
        .limit(1)
      projectRow = row
    }

    if (!projectRow) {
      throw httpError("Not Found", 404)
    }

    const member = await findMembership(projectRow.orgId, session.user.id)
    if (!member) {
      throw httpError("Forbidden", 403)
    }

    c.set("orgId", member.orgId)
    c.set("role", member.role)
    c.set("userId", session.user.id)
    c.set("projectId", projectRow.id)
    await next()
  }
)
