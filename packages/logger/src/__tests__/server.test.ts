import { describe, it, expect, vi, beforeEach } from "vitest"

const mockWinstonLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}))

vi.mock("winston", () => ({
  default: {
    createLogger: vi.fn(() => mockWinstonLogger),
    format: {
      json: vi.fn(() => "json-format"),
      combine: vi.fn(() => "combined-format"),
      colorize: vi.fn(() => "colorize-format"),
      timestamp: vi.fn(() => "timestamp-format"),
      errors: vi.fn(() => "errors-format"),
      printf: vi.fn(() => "printf-format"),
    },
    transports: {
      Console: vi.fn(() => "console-transport"),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NODE_ENV
  delete process.env.LOG_LEVEL
})

describe("server createLogger", () => {
  it("forwards info with string message", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.info("hello")
    expect(mockWinstonLogger.info).toHaveBeenCalledWith("hello")
  })

  it("forwards info with object and message", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.info({ userId: 1 }, "user action")
    expect(mockWinstonLogger.info).toHaveBeenCalledWith("user action", {
      userId: 1,
    })
  })

  it("forwards warn with string message", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.warn("warning")
    expect(mockWinstonLogger.warn).toHaveBeenCalledWith("warning")
  })

  it("forwards error with Error object", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    const err = new Error("boom")
    logger.error(err)
    expect(mockWinstonLogger.error).toHaveBeenCalledWith("boom", { err })
  })

  it("forwards error with string", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.error("fail")
    expect(mockWinstonLogger.error).toHaveBeenCalledWith("fail")
  })

  it("forwards error with object", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.error({ code: 500 }, "server error")
    expect(mockWinstonLogger.error).toHaveBeenCalledWith("server error", {
      code: 500,
    })
  })

  it("forwards error with unknown type using String()", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.error(42)
    expect(mockWinstonLogger.error).toHaveBeenCalledWith("42")
  })

  it("forwards debug with string message", async () => {
    const { createLogger } = await import("../server")
    const logger = createLogger("test")
    logger.debug("debugging")
    expect(mockWinstonLogger.debug).toHaveBeenCalledWith("debugging")
  })
})
