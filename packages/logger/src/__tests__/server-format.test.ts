import { describe, it, expect } from "vitest"
import winston from "winston"
import { serverFormat } from "../server"

const CollectTransportBase = (
  winston as unknown as {
    Transport: typeof winston.transports.Console
  }
).Transport

class CollectTransport extends CollectTransportBase {
  lines: winston.Logform.TransformableInfo[] = []

  log(info: winston.Logform.TransformableInfo, next: () => void): void {
    this.lines.push(info)
    next()
  }
}

function render(
  production: boolean,
  message: string,
  meta: Record<string, unknown>
): string {
  const transport = new CollectTransport()
  const logger = winston.createLogger({
    format: serverFormat(production),
    transports: [transport],
  })
  logger.info(message, meta)
  const info = transport.lines[0]
  return String(info[Symbol.for("message")])
}

describe("serverFormat error serialization", () => {
  it("renders Error message and stack from meta in dev format", () => {
    const out = render(false, "column integration: publish failed", {
      projectId: "p",
      error: new Error("GitHub API 401"),
    })
    expect(out).toContain("GitHub API 401")
    expect(out).toContain("Error:")
  })

  it("serializes Error in meta as JSON in production format", () => {
    const out = render(true, "publish failed", {
      error: new Error("GitHub API 401"),
    })
    expect(out).toContain('"message":"GitHub API 401"')
    expect(out).toContain('"stack"')
  })

  it("keeps plain object meta unchanged", () => {
    const transport = new CollectTransport()
    const logger = winston.createLogger({
      format: serverFormat(false),
      transports: [transport],
    })
    logger.info("ok", { cardId: "c", projectId: "p" })
    expect(transport.lines[0].cardId).toBe("c")
    expect(transport.lines[0].projectId).toBe("p")
  })
})
