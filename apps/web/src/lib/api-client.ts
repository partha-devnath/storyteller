import { createLogger } from "@workspace/logger/browser"

const logger = createLogger("api-client")
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

type RequestOptions = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export async function apiClient<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    const errMsg = data.error ?? `Request failed with status ${response.status}`
    logger.error({ status: response.status, path, method }, errMsg)
    throw new Error(errMsg)
  }

  return data
}
