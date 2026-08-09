import { Hono } from "hono"
import { and, asc, desc, eq, isNull } from "drizzle-orm"
import { auth } from "@workspace/auth"
import { db } from "@workspace/db"
import { chatMessage, chatSession } from "@workspace/schemas"
import { chatMessageInputSchema } from "@workspace/schemas/validations/chat"
import { aiProvider } from "@workspace/ai"
import { embedChatMessage } from "@workspace/vector"
import { createLogger } from "@workspace/logger"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { requireRole } from "../middleware/role-guard"
import { errorHandler } from "../middleware/error-handler"
import { validateBody } from "../middleware/validate"
import { httpError } from "../middleware/org-scope"
import { generateId } from "../utils"
import type { AppEnv } from "../middleware/env"

const logger = createLogger("api/chat")

export const chatRoutes = new Hono<AppEnv>()
chatRoutes.onError(errorHandler)

chatRoutes.use("*", resolveOrgFromProject)

// ---------- Sessions ----------

chatRoutes.get(
  "/sessions",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const projectId = c.var.projectId!
    const rows = await db
      .select({
        id: chatSession.id,
        title: chatSession.title,
        createdAt: chatSession.createdAt,
        updatedAt: chatSession.updatedAt,
      })
      .from(chatSession)
      .where(eq(chatSession.projectId, projectId))
      .orderBy(desc(chatSession.updatedAt))
    return c.json({ success: true, data: rows })
  }
)

chatRoutes.post(
  "/sessions",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const projectId = c.var.projectId!
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    const body = await c.req.json().catch(() => ({}))
    const title = String(body?.title ?? "").trim() || "New session"
    const [row] = await db
      .insert(chatSession)
      .values({
        id: generateId(),
        projectId,
        title,
        createdBy: session?.user.id ?? null,
      })
      .returning()
    return c.json({ success: true, data: row }, 201)
  }
)

chatRoutes.patch(
  "/sessions/:id",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const projectId = c.var.projectId!
    const sessionId = c.req.param("id")
    const body = await c.req.json().catch(() => ({}))
    const title = String(body?.title ?? "").trim()
    if (!title) throw httpError("Title is required", 400)

    const [existing] = await db
      .select()
      .from(chatSession)
      .where(
        and(eq(chatSession.id, sessionId), eq(chatSession.projectId, projectId))
      )
      .limit(1)
    if (!existing) throw httpError("Not Found", 404)

    const [row] = await db
      .update(chatSession)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatSession.id, sessionId))
      .returning()
    return c.json({ success: true, data: row })
  }
)

chatRoutes.delete(
  "/sessions/:id",
  requireRole("owner", "admin", "member"),
  async (c) => {
    const projectId = c.var.projectId!
    const sessionId = c.req.param("id")
    const [existing] = await db
      .select()
      .from(chatSession)
      .where(
        and(eq(chatSession.id, sessionId), eq(chatSession.projectId, projectId))
      )
      .limit(1)
    if (!existing) throw httpError("Not Found", 404)
    await db.delete(chatSession).where(eq(chatSession.id, sessionId))
    return c.json({ success: true, data: { deleted: sessionId } })
  }
)

// ---------- Messages ----------

chatRoutes.get("/", requireRole("owner", "admin", "member"), async (c) => {
  const projectId = c.var.projectId!
  const sessionId = c.req.query("sessionId") || null
  const rows = await db
    .select()
    .from(chatMessage)
    .where(
      and(
        eq(chatMessage.projectId, projectId),
        sessionId
          ? eq(chatMessage.sessionId, sessionId)
          : isNull(chatMessage.sessionId)
      )
    )
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
      sessionId?: string | null
      mentions?: { type: "card" | "member"; id: string; label: string }[] | null
    }

    const sessionId = body.sessionId ?? null
    if (sessionId) {
      const [existing] = await db
        .select()
        .from(chatSession)
        .where(
          and(
            eq(chatSession.id, sessionId),
            eq(chatSession.projectId, projectId)
          )
        )
        .limit(1)
      if (!existing) throw httpError("Not Found", 404)
    }

    const [row] = await db
      .insert(chatMessage)
      .values({
        id: generateId(),
        projectId,
        sessionId,
        role: body.role,
        kind: body.kind,
        content: body.content ?? "",
        questions: body.questions ?? null,
        proposalId: body.proposalId ?? null,
        mentions: body.mentions ?? null,
      })
      .returning()

    if (sessionId && body.role === "user") {
      await db
        .update(chatSession)
        .set({ updatedAt: new Date() })
        .where(eq(chatSession.id, sessionId))
    }

    if (body.role === "user" && body.kind === "prompt" && row.content?.trim()) {
      try {
        await embedChatMessage({ messageId: row.id, provider: aiProvider })
      } catch (error) {
        logger.warn(
          {
            messageId: row.id,
            error: error instanceof Error ? error.message : String(error),
          },
          "chat: failed to embed user message"
        )
      }
    }

    return c.json({ success: true, data: row }, 201)
  }
)
