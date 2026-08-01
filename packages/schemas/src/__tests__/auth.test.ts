import { describe, it, expect } from "vitest"
import { loginSchema, signupSchema } from "../validations/auth"

describe("auth validations", () => {
  it("validates signup with valid data", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "Password123",
      confirmPassword: "Password123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects signup with short password", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "123",
      confirmPassword: "123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects signup with invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "not-an-email",
      password: "Password123",
      confirmPassword: "Password123",
    })
    expect(result.success).toBe(false)
  })

  it("validates login with valid data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    })
    expect(result.success).toBe(true)
  })
})
