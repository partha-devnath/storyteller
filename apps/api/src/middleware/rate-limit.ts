import { createMiddleware } from "hono/factory"
import { getConnInfo } from "hono/bun"

/**
 * Per-route in-memory rate limiter. Each rateLimiter(max, window) call owns
 * its OWN store, so the auth (500/60s), AI (100/60s), billing (10/60s),
 * webhook (60/60s), and upload (10/60s) limits are independent per-IP
 * windows. A shared module-level Map would collapse every route into one
 * bucket — auth/get-session traffic would consume the billing route's
 * budget and the per-route limits would be meaningless.
 */
export function rateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetTime: number }>()

  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetTime) {
        store.delete(key)
      }
    }
  }, 60_000).unref()

  return createMiddleware(async (c, next) => {
    let address: string
    try {
      address = getConnInfo(c).remote.address ?? "unknown"
    } catch {
      address = "127.0.0.1"
    }
    const key = address
    const now = Date.now()

    const entry = store.get(key)
    if (!entry || now > entry.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (entry.count >= maxRequests) {
      return c.json({ success: false, error: "Too many requests" }, 429)
    }

    entry.count++
    return next()
  })
}
