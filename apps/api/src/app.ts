import { createFactory } from "hono/factory"
import { cors } from "hono/cors"
import { eq, sql } from "drizzle-orm"
import { getConnInfo } from "hono/bun"
import { auth } from "@workspace/auth"
import { createLogger } from "@workspace/logger"
import { db } from "@workspace/db"
import { file as fileSchema } from "@workspace/schemas"
import { createS3Storage, uploadFile } from "@workspace/files"
import { orgsRoutes } from "./routes/orgs"
import { billingRoutes, stripeWebhookRoutes } from "./routes/billing"
import { analyticsRoutes } from "./routes/analytics"
import { templatesRoutes } from "./routes/templates"
import { projectsRoutes } from "./routes/projects"
import { aiRoutes } from "./routes/ai"
import { proposalsRoutes } from "./routes/proposals"
import { cardsRoutes } from "./routes/cards"
import { graphRoutes } from "./routes/graph"
import { eventsRoutes } from "./routes/events"
import { exportRoutes } from "./routes/export"
import { rateLimiter } from "./middleware/rate-limit"

type Env = {
  Variables: {
    requestId: string
  }
}

const factory = createFactory<Env>()
const logger = createLogger("api")

const storage = createS3Storage({
  bucket: process.env.S3_BUCKET ?? "template",
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  baseUrl: process.env.S3_BASE_URL,
})

const app = factory.createApp()

app.use(
  "*",
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
)

app.use("*", async (c, next) => {
  await next()
  c.res.headers.set("X-Content-Type-Options", "nosniff")
  c.res.headers.set("X-Frame-Options", "DENY")
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  c.res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )
  c.res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  )
  c.res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'"
  )
})

app.use(
  "*",
  factory.createMiddleware(async (c, next) => {
    let remote: { address?: string; addressType?: string; port?: number }
    try {
      remote = getConnInfo(c).remote
    } catch {
      remote = { address: "127.0.0.1" }
    }
    const requestId = crypto.randomUUID()
    c.set("requestId", requestId)
    c.header("X-Request-Id", requestId)
    logger.info({ remote, requestId }, `${c.req.method} ${c.req.path}`)
    await next()
  })
)

app.use(
  "*",
  factory.createMiddleware(async (c, next) => {
    try {
      await next()
    } catch (error) {
      logger.error(error, "Unhandled error")
      const status =
        error instanceof Error && "status" in error
          ? (error as { status: number }).status
          : 500
      const message =
        error instanceof Error ? error.message : "Internal Server Error"
      return c.json(
        {
          success: false,
          error: status === 500 ? "Internal Server Error" : message,
        },
        status as 400 | 401 | 403 | 404 | 500
      )
    }
  })
)

app.get("/", (c) =>
  c.json({ success: true, data: { service: "storyteller-api" } })
)

app.use(
  "/api/auth/*",
  rateLimiter(Number(process.env.AUTH_RATE_LIMIT_MAX) || 30, 60_000)
)

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

app.route("/api/orgs", orgsRoutes)
app.route("/api/orgs", billingRoutes)
app.route("/api/orgs", analyticsRoutes)
app.route("/api/orgs", templatesRoutes)
app.route("/api/projects", projectsRoutes)
app.route("/api/projects", graphRoutes)
app.route("/api/projects", eventsRoutes)
app.route("/api/projects", exportRoutes)

app.use(
  "/api/ai/*",
  rateLimiter(Number(process.env.AI_RATE_LIMIT_MAX) || 10, 60_000)
)
app.route("/api/ai", aiRoutes)
app.route("/api/proposals", proposalsRoutes)
app.route("/api/cards", cardsRoutes)

app.use(
  "/api/stripe/*",
  rateLimiter(Number(process.env.STRIPE_RATE_LIMIT_MAX) || 60, 60_000)
)
app.route("/api/stripe", stripeWebhookRoutes)

app.get("/api/health", async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({
      success: true,
      data: { status: "ok", db: "connected", requestId: c.var.requestId },
    })
  } catch {
    return c.json(
      {
        success: false,
        data: {
          status: "error",
          db: "disconnected",
          requestId: c.var.requestId,
        },
      },
      503
    )
  }
})

app.get("/api/protected", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401)
  }
  return c.json({ success: true, data: { user: session.user } })
})

app.post("/api/files/upload", rateLimiter(10, 60_000), async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401)
  }

  const contentLength = Number(c.req.header("content-length") ?? 0)
  if (contentLength > 10 * 1024 * 1024) {
    return c.json({ success: false, error: "Request body too large" }, 413)
  }

  const formdata = await c.req.formData()
  const file = formdata.get("file")

  if (!file || !(file instanceof File)) {
    return c.json({ success: false, error: "No file provided" }, 400)
  }

  try {
    const result = await uploadFile({
      storage,
      userId: session.user.id,
      file,
      maxSize: 10 * 1024 * 1024,
    })
    return c.json({ success: true, data: result }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed"
    return c.json({ success: false, error: message }, 400)
  }
})

app.get("/api/files/raw/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401)
  }
  const id = c.req.param("id")
  const [record] = await db
    .select()
    .from(fileSchema)
    .where(eq(fileSchema.id, id))
    .limit(1)
  if (!record) {
    return c.json({ success: false, error: "File not found" }, 404)
  }
  if (record.userId !== session.user.id) {
    return c.json({ success: false, error: "Forbidden" }, 403)
  }
  return storage.serve(record.storedName)
})

app.get("/api/files/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401)
  }
  const id = c.req.param("id")
  const [record] = await db
    .select()
    .from(fileSchema)
    .where(eq(fileSchema.id, id))
    .limit(1)
  if (!record) {
    return c.json({ success: false, error: "File not found" }, 404)
  }
  if (record.userId !== session.user.id) {
    return c.json({ success: false, error: "Forbidden" }, 403)
  }
  return c.json({ success: true, data: record })
})

app.delete("/api/files/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401)
  }

  const id = c.req.param("id")
  const [record] = await db
    .select()
    .from(fileSchema)
    .where(eq(fileSchema.id, id))
    .limit(1)
  if (!record) {
    return c.json({ success: false, error: "File not found" }, 404)
  }

  if (record.userId !== session.user.id) {
    return c.json({ success: false, error: "Forbidden" }, 403)
  }

  try {
    await storage.delete(record.storedName)
    await db.delete(fileSchema).where(eq(fileSchema.id, id))
    return c.json({ success: true, data: { deleted: id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return c.json({ success: false, error: message }, 500)
  }
})

export default app
