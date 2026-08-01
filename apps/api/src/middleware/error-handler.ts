import type { ErrorHandler } from "hono"
import { createLogger } from "@workspace/logger"

const logger = createLogger("api")

export const errorHandler: ErrorHandler = (error) => {
  logger.error(error, "Unhandled error")
  const status =
    error instanceof Error && "status" in error
      ? (error as { status: number }).status
      : 500
  const message =
    error instanceof Error ? error.message : "Internal Server Error"
  return new Response(
    JSON.stringify({
      success: false,
      error: status === 500 ? "Internal Server Error" : message,
    }),
    {
      status,
      headers: { "content-type": "application/json" },
    }
  )
}
