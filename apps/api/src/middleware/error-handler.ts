import type { ErrorHandler } from "hono"
import { createLogger } from "@workspace/logger"
import { AiOutputError } from "@workspace/ai"
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

  if (error instanceof AiOutputError) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 422,
        headers: { "content-type": "application/json" },
      }
    )
  }

  logger.error(error instanceof Error ? error.message : "Unknown error", {
    err: {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    },
  })
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
