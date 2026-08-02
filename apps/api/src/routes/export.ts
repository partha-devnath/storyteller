import { Hono } from "hono"
import { z } from "zod"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import {
  buildExportData,
  toCsv,
  toJson,
  toMarkdown,
} from "../services/export-data"
import type { AppEnv } from "../middleware/env"

export const exportRoutes = new Hono<AppEnv>()
exportRoutes.onError(errorHandler)

const exportFormatSchema = z.enum(["csv", "json", "md"])

const extByFormat: Record<"csv" | "json" | "md", string> = {
  csv: "csv",
  json: "json",
  md: "md",
}

const contentTypeByFormat: Record<"csv" | "json" | "md", string> = {
  csv: "text/csv",
  json: "application/json",
  md: "text/markdown",
}

// Path-scoped middleware: only applies to the export route (sibling sub-apps at
// the same /api/projects prefix must not have their auth gates intercepted, and
// an invalid format must be rejected with 400 before any org/DB work happens).
exportRoutes.use("/:slug/export", async (c, next) => {
  const parsed = exportFormatSchema.safeParse(c.req.query("format"))
  if (!parsed.success) throw httpError("Invalid format", 400)
  await next()
})

exportRoutes.get("/:slug/export", resolveOrgFromProject, async (c) => {
  const format = c.req.query("format") as "csv" | "json" | "md"
  const projectId = c.var.projectId!

  const data = await buildExportData(projectId)
  const filename = `${data.project.slug}-${new Date()
    .toISOString()
    .slice(0, 10)}.${extByFormat[format]}`

  const body =
    format === "csv"
      ? toCsv(data)
      : format === "json"
        ? toJson(data)
        : toMarkdown(data)

  c.header("Content-Type", contentTypeByFormat[format])
  c.header("Content-Disposition", `attachment; filename="${filename}"`)
  return c.body(body)
})
