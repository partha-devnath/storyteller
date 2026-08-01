import { describe, it, expect } from "vitest"
import { uploadFileSchema, MAX_FILE_SIZE } from "../validations/files"

describe("uploadFileSchema", () => {
  function createMockFile(
    size: number,
    mimeType = "image/png",
    name = "test.png"
  ): File {
    return new File([new Uint8Array(size)], name, { type: mimeType })
  }

  it("accepts valid file under max size", () => {
    const file = createMockFile(1024)
    const result = uploadFileSchema.safeParse({ file, purpose: "avatar" })
    expect(result.success).toBe(true)
  })

  it("defaults purpose to attachment", () => {
    const file = createMockFile(1024)
    const result = uploadFileSchema.safeParse({ file })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.purpose).toBe("attachment")
    }
  })

  it("rejects file exceeding MAX_FILE_SIZE", () => {
    const file = createMockFile(MAX_FILE_SIZE + 1)
    const result = uploadFileSchema.safeParse({ file })
    expect(result.success).toBe(false)
  })

  it("accepts file exactly at MAX_FILE_SIZE", () => {
    const file = createMockFile(MAX_FILE_SIZE)
    const result = uploadFileSchema.safeParse({ file })
    expect(result.success).toBe(true)
  })

  it("rejects invalid purpose", () => {
    const file = createMockFile(1024)
    const result = uploadFileSchema.safeParse({ file, purpose: "invalid" })
    expect(result.success).toBe(false)
  })

  it("accepts all valid purposes", () => {
    const file = createMockFile(1024)
    for (const purpose of ["avatar", "attachment", "document"] as const) {
      const result = uploadFileSchema.safeParse({ file, purpose })
      expect(result.success).toBe(true)
    }
  })

  it("rejects missing file", () => {
    const result = uploadFileSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
