import { sql } from "drizzle-orm"
import app from "./app"
import { validateEnv } from "./env"
import { db, closeDb } from "@workspace/db"
import { createLogger } from "@workspace/logger"

const env = validateEnv()
const logger = createLogger("api")

async function waitForDb(maxRetries = 10, baseDelay = 1000): Promise<void> {
  let delay = baseDelay
  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.execute(sql`SELECT 1`)
      logger.info("Database connection established")
      return
    } catch {
      if (i < maxRetries - 1) {
        logger.warn(
          { attempt: i + 1, maxRetries, delay },
          "Database not ready, retrying..."
        )
        await new Promise((r) => setTimeout(r, delay))
        delay = Math.min(delay * 1.5, 15_000)
      }
    }
  }
  logger.error("Could not connect to database after retries")
  process.exit(1)
}

await waitForDb()

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
})

logger.info(`API server running on http://localhost:${env.PORT}`)

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down...`)
  server.stop()
  try {
    await closeDb()
    logger.info("Database connection closed")
  } catch (error) {
    logger.error(error, "Error closing database connection")
  }
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
