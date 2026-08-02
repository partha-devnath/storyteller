import type { ErrorHandler } from "hono"
import { createLogger } from "@workspace/logger"
import { LimitError } from "../services/plan-limits"

const logger = createLogger("api")

export const errorHandler: ErrorHandler = (error) => {
  // LimitError is an expected 402, not an internal failure — serialize the
  // UI-SPEC limit payload and skip error logging.
  if (error instanceof LimitError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        data: {
          code: "limit_reached",
          metric: error.metric,
          limit: error.limit,
          usage: error.usage,
        },
      }),
      {
        status: 402,
        headers: { "content-type": "application/json" },
      }
    )
  }

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
