import { createMiddleware } from "hono/factory"
import { getConnInfo } from "hono/bun"

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60_000).unref()

/** Shared in-memory rate limiter (per-IP window). */
export function rateLimiter(maxRequests: number, windowMs: number) {
  return createMiddleware(async (c, next) => {
    let address: string
    try {
      address = getConnInfo(c).remote.address ?? "unknown"
    } catch {
      address = "127.0.0.1"
    }
    const key = address
    const now = Date.now()

    const entry = rateLimitStore.get(key)
    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (entry.count >= maxRequests) {
      return c.json({ success: false, error: "Too many requests" }, 429)
    }

    entry.count++
    return next()
  })
}
