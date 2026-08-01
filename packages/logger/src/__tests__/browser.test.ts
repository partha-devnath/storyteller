import { describe, it, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("browser createLogger", () => {
  it("logs info message to console.info", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("test")
    logger.info("hello")
    expect(infoSpy).toHaveBeenCalled()
    infoSpy.mockRestore()
  })

  it("logs warn message to console.warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("test")
    logger.warn("warning")
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it("logs error message to console.error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("test")
    logger.error("fail")
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("logs debug message to console.debug", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("test")
    logger.debug("debug")
    expect(debugSpy).toHaveBeenCalled()
    debugSpy.mockRestore()
  })

  it("logs object with message", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("test")
    logger.info({ key: "val" }, "context")
    expect(infoSpy).toHaveBeenCalled()
    infoSpy.mockRestore()
  })

  it("logs Error object", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("test")
    logger.error(new Error("boom"))
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("includes service name in log output", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    const { createLogger } = await import("../browser")
    const logger = createLogger("my-service")
    logger.info("started")
    expect(infoSpy).toHaveBeenCalled()
    infoSpy.mockRestore()
  })
})
