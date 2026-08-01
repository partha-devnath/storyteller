import { createMiddleware } from "hono/factory"
import type { AppEnv, OrgRole } from "./env"

export function requireRole(...roles: OrgRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const role = c.var.role
    if (!role || !roles.includes(role)) {
      const err = new Error("Forbidden: insufficient role") as Error & {
        status: number
      }
      err.status = 403
      throw err
    }
    await next()
  })
}
