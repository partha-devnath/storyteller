import { describe, it, expect, vi, beforeEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
})

describe("createS3Storage edge cases", () => {
  it("url with no endpoint starts with slash", async () => {
    const { createS3Storage } = await import("../storage")
    const storage = createS3Storage({ bucket: "my-bucket" })
    expect(storage.url("test.png")).toBe("/my-bucket/test.png")
  })

  it("url with bucket and region only", async () => {
    const { createS3Storage } = await import("../storage")
    const storage = createS3Storage({
      bucket: "my-bucket",
      region: "eu-west-1",
    })
    expect(storage.url("test.png")).toBe("/my-bucket/test.png")
  })

  it("delete calls DeleteObjectCommand", async () => {
    const sendMock = vi.fn().mockResolvedValue({})
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = sendMock
      }
      return {
        S3Client,
        DeleteObjectCommand: class {
          constructor(public input: unknown) {}
        },
      }
    })

    const { createS3Storage } = await import("../storage")
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
    })
    await storage.delete("test.png")
    expect(sendMock).toHaveBeenCalledOnce()
  })

  it("serve returns 404 when NoSuchKey is thrown", async () => {
    class NoSuchKey extends Error {
      name = "NoSuchKey"
    }

    const sendMock = vi.fn().mockRejectedValue(new NoSuchKey("not found"))
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = sendMock
      }
      return {
        S3Client,
        GetObjectCommand: class {
          constructor(public input: unknown) {}
        },
        NoSuchKey,
      }
    })

    const { createS3Storage } = await import("../storage")
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
    })
    const res = await storage.serve("missing.png")
    expect(res.status).toBe(404)
    expect(await res.text()).toBe("File not found")
  })

  it("serve rethrows non-NoSuchKey errors", async () => {
    const sendMock = vi.fn().mockRejectedValue(new Error("network error"))
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = sendMock
      }
      return {
        S3Client,
        GetObjectCommand: class {
          constructor(public input: unknown) {}
        },
        NoSuchKey: class extends Error {
          name = "NoSuchKey"
        },
      }
    })

    const { createS3Storage } = await import("../storage")
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
    })
    await expect(storage.serve("test.png")).rejects.toThrow("network error")
  })

  it("save calls PutObjectCommand and returns stored file", async () => {
    const sendMock = vi.fn().mockResolvedValue({})
    vi.doMock("@aws-sdk/client-s3", () => {
      class S3Client {
        send = sendMock
      }
      return {
        S3Client,
        PutObjectCommand: class {
          constructor(public input: unknown) {}
        },
      }
    })

    const { createS3Storage } = await import("../storage")
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
    })
    const file = new File(["hello"], "test.txt", { type: "text/plain" })
    const result = await storage.save(file, "abc123.txt")

    expect(result.id).toBe("abc123.txt")
    expect(result.storedName).toBe("abc123.txt")
    expect(result.url).toBe("http://localhost:4566/my-bucket/abc123.txt")
    expect(sendMock).toHaveBeenCalledOnce()
  })
})
