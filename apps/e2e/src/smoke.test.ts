import { test, expect } from "@playwright/test"
import { TEST_USER } from "./seed"

test.describe("smoke", () => {
  test("landing page loads and links to signup", async ({ page }) => {
    await page.goto("/")
    await expect(
      page.getByText("Turn a product idea into a living requirements board.")
    ).toBeVisible()
    await page.getByRole("link", { name: "Get started" }).click()
    await expect(page).toHaveURL("/signup")
  })

  test("login page shows sign in form", async ({ page }) => {
    await page.goto("/login")
    await expect(
      page.getByText("Enter your credentials to continue")
    ).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  })

  test("navigates to signup page from login", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Create account" }).click()
    await expect(page).toHaveURL("/signup")
    await expect(
      page.getByText("Fill in the details to get started")
    ).toBeVisible()
  })

  test("navigates to forgot password page", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Forgot password?" }).click()
    await expect(page).toHaveURL("/forgot-password")
    await expect(
      page.getByText("Enter your email and we'll send you a reset link")
    ).toBeVisible()
  })

  test("signs in with seeded user and redirects to projects", async ({
    page,
  }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill(TEST_USER.email)
    await page.getByLabel("Password").fill(TEST_USER.password)
    await page.getByRole("button", { name: "Sign in" }).click()
    await expect(page).toHaveURL("/projects", { timeout: 10_000 })
    await expect(page.getByText(TEST_USER.name, { exact: true })).toBeVisible()
  })
})
