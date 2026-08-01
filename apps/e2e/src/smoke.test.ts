import { test, expect } from "@playwright/test"
import { TEST_USER } from "./seed"

test.describe("smoke", () => {
  test("page loads and shows sign in form", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("navigates to signup page", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Create account" }).click()
    await expect(page).toHaveURL("/signup")
    await expect(
      page.getByRole("heading", { name: "Create account" })
    ).toBeVisible()
  })

  test("navigates to forgot password page", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Forgot password?" }).click()
    await expect(page).toHaveURL("/forgot-password")
    await expect(
      page.getByRole("heading", { name: "Forgot password?" })
    ).toBeVisible()
  })

  test("signs in with seeded user and redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByLabel("Email").fill(TEST_USER.email)
    await page.getByLabel("Password").fill(TEST_USER.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/dashboard", { timeout: 10_000 })
    await expect(page.getByText(TEST_USER.name)).toBeVisible()
  })
})
