import { createMiddleware } from "hono/factory"
import type { ZodType } from "zod"
import type { AppEnv } from "./env"

export function validateBody(schema: ZodType) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const result = schema.safeParse(await c.req.json())
    if (!result.success) {
      const err = new Error(
        result.error.issues.map((i) => i.message).join("; ")
      ) as Error & { status: number }
      err.status = 400
      throw err
    }
    c.set("body", result.data)
    await next()
  })
}
