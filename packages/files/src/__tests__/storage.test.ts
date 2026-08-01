import { describe, it, expect } from "vitest"
import { createS3Storage } from "../storage"

describe("createS3Storage", () => {
  it("generates url with baseUrl", () => {
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
      baseUrl: "https://cdn.example.com",
    })
    expect(storage.url("test.png")).toBe("https://cdn.example.com/test.png")
  })

  it("generates url without baseUrl uses endpoint", () => {
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
    })
    expect(storage.url("test.png")).toBe(
      "http://localhost:4566/my-bucket/test.png"
    )
  })

  it("trim trailing slash on baseUrl", () => {
    const storage = createS3Storage({
      bucket: "my-bucket",
      endpoint: "http://localhost:4566",
      baseUrl: "https://cdn.example.com/",
    })
    expect(storage.url("test.png")).toBe("https://cdn.example.com/test.png")
  })
})
