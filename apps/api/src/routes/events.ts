import { Hono } from "hono"
import { auth } from "@workspace/auth"
import { resolveOrgFromProject } from "../middleware/org-scope"
import { errorHandler } from "../middleware/error-handler"
import { httpError } from "../middleware/org-scope"
import { subscribe, type ProjectEvent } from "../services/event-bus"
import type { AppEnv } from "../middleware/env"

export const eventsRoutes = new Hono<AppEnv>()
eventsRoutes.onError(errorHandler)

eventsRoutes.get("/:slug/events", resolveOrgFromProject, async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw httpError("Unauthorized", 401)
  const projectId = c.var.projectId!

  let cleanup: (() => void) | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => {
        try {
          controller.enqueue(new TextEncoder().encode(text))
        } catch {
          // controller already closed — drop the frame
        }
      }

      const handler = (event: ProjectEvent) => {
        const { type, ...payload } = event
        send(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`)
      }
      const unsubscribe = subscribe(projectId, handler)
      const heartbeat = setInterval(() => send(": ping\n\n"), 25_000)

      cleanup = () => {
        clearInterval(heartbeat)
        unsubscribe()
      }

      c.req.raw.signal.addEventListener("abort", cleanup)
    },
    cancel() {
      cleanup?.()
    },
  })

  c.header("Content-Type", "text/event-stream")
  c.header("Cache-Control", "no-cache")
  c.header("Connection", "keep-alive")
  c.header("X-Accel-Buffering", "no")
  return c.body(stream)
})
