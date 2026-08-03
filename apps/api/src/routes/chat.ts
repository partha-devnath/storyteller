import { Hono } from "hono"
import { asc, eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { chatMessage } from "@workspace/schemas"
import { chatMessageInputSchema } from "@workspace/schemas/validations/chat"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { validateBody } from "../middleware/validate"
import { generateId } from "../utils"
import type { AppEnv } from "../middleware/env"

export const chatRoutes = new Hono<AppEnv>()
chatRoutes.onError(errorHandler)

chatRoutes.use("*", resolveOrgFromProject)

chatRoutes.get("/", requireRole("owner", "admin", "member"), async (c) => {
  const projectId = c.var.projectId!
  const rows = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.projectId, projectId))
    .orderBy(asc(chatMessage.createdAt))
  return c.json({ success: true, data: rows })
})

chatRoutes.post(
  "/",
  requireRole("owner", "admin", "member"),
  validateBody(chatMessageInputSchema),
  async (c) => {
    const projectId = c.var.projectId!
    const body = c.var.body as {
      role: "user" | "ai"
      kind: "prompt" | "board" | "clarifying" | "error"
      content?: string
      questions?: { question: string; options?: string[] }[] | null
      proposalId?: string | null
    }
    const [row] = await db
      .insert(chatMessage)
      .values({
        id: generateId(),
        projectId,
        role: body.role,
        kind: body.kind,
        content: body.content ?? "",
        questions: body.questions ?? null,
        proposalId: body.proposalId ?? null,
      })
      .returning()
    return c.json({ success: true, data: row }, 201)
  }
)
