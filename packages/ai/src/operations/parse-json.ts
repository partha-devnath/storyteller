import { z } from "zod"
import type { ChatMessage, LLMProvider } from "../types"
import { AiOutputError } from "../errors"
import { isEmptyClarifying } from "./output-guard"

export function extractJson(raw: string): string {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new SyntaxError("No JSON object found in AI output")
  }
  return raw.slice(start, end + 1)
}

function formatZodFeedback(issues: unknown): string {
  if (Array.isArray(issues) && issues.length > 0) {
    const details = issues
      .slice(0, 8)
      .map((issue: { path?: (string | number)[]; message?: string }) => {
        const path = issue.path?.length ? issue.path.join(".") : "(root)"
        return `- ${path}: ${issue.message ?? "invalid value"}`
      })
      .join("\n")
    return [
      "Your previous response did not match the required JSON schema.",
      "Validation errors:",
      details,
      "Respond with ONLY the corrected JSON object matching the schema exactly. No markdown fences, no prose, no extra keys, no trailing text.",
    ].join("\n")
  }
  return "Your previous response was not valid JSON or was an empty clarifying response. Respond with ONLY the JSON object matching the schema exactly. No markdown fences, no prose, no extra keys, no trailing text."
}

export async function parseJsonWithRetry<T>({
  provider,
  messages,
  schema,
  errorMessage,
}: {
  provider: LLMProvider
  messages: ChatMessage[]
  schema: z.ZodType<T>
  errorMessage: string
}): Promise<T> {
  let lastRaw = ""
  let lastIssues: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptMessages =
      attempt === 0
        ? messages
        : [
            ...messages,
            { role: "user" as const, content: formatZodFeedback(lastIssues) },
          ]

    const raw = await provider.chat(attemptMessages)
    lastRaw = raw

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(extractJson(raw))
    } catch {
      lastIssues = "AI output is not valid JSON"
      continue
    }

    const parsed = schema.safeParse(parsedJson)
    if (parsed.success && !isEmptyClarifying(parsedJson)) {
      return parsed.data
    }
    lastIssues = parsed.success
      ? "empty clarifying output"
      : parsed.error.issues
  }

  throw new AiOutputError(errorMessage, lastIssues, lastRaw)
}
