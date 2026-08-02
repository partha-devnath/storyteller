import { test, expect, type Page } from "@playwright/test"
import { TEST_USER_B } from "./seed"

const MAILPIT_API = process.env.MAILPIT_API ?? "http://localhost:8025/api/v1"

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

async function getVerificationUrl(email: string): Promise<string> {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_API}/messages`)
    if (res.ok) {
      const data = (await res.json()) as {
        messages: { ID: string; To: { Address: string }[] }[]
      }
      const msg = data.messages.find((m) =>
        m.To.some((t) => t.Address === email)
      )
      if (msg) {
        const detail = await fetch(`${MAILPIT_API}/message/${msg.ID}`)
        const full = (await detail.json()) as { Text?: string }
        const match = (full.Text ?? "").match(/https?:\/\/[^\s]+/)
        if (match) return match[0].replace(/[).,]+$/, "")
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No verification email found for ${email}`)
}

async function signupViaUi(
  page: Page,
  name: string,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/signup")
  await page.getByLabel("Name").fill(name)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByLabel("Confirm password").fill(password)
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page).toHaveURL(/verify-email/, { timeout: 10_000 })

  const verifyUrl = await getVerificationUrl(email)
  await page.goto(verifyUrl)
  await expect(page).toHaveURL(/dashboard|projects/, { timeout: 15_000 })
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/dashboard|projects/, { timeout: 10_000 })
}

async function createProject(
  page: Page,
  name: string,
  slug: string
): Promise<void> {
  await page
    .getByRole("main")
    .getByRole("button", { name: "New board" })
    .click()
  await page.getByLabel("Name").fill(name)
  await page.getByLabel("Description").fill("Created by E2E")
  await page.getByRole("button", { name: "Create", exact: true }).click()
  await expect(page).toHaveURL(`/projects/${slug}`, { timeout: 10_000 })
}

async function runPrompt(page: Page, prompt: string) {
  await page.getByTestId("prompt-input").fill(prompt)
  await page.getByRole("button", { name: "Generate" }).click()
}

test.describe.serial("core loop", () => {
  let userA = { name: "", email: "", password: "TestPass123!" }
  let userASlug = ""

  test("J1: signup creates personal org, project, and AI-generated proposal", async ({
    page,
  }) => {
    const suffix = uniqueSuffix()
    userA = {
      name: `User A ${suffix}`,
      email: `e2e-a-${suffix}@test.com`,
      password: "TestPass123!",
    }
    await signupViaUi(page, userA.name, userA.email, userA.password)

    await page.goto("/projects")
    await expect(page.getByRole("heading", { name: "Boards" })).toBeVisible()

    userASlug = `loyalty-${suffix}`
    await createProject(page, `Loyalty ${suffix}`, userASlug)

    await page.goto(`/projects/${userASlug}/chat`)
    await runPrompt(page, "Build a loyalty program with enrollment and rewards")
    await expect(page.getByText(/Generated \d+ story cards/)).toBeVisible({
      timeout: 15_000,
    })

    await page.goto(`/projects/${userASlug}`)
    await expect(page.getByTestId("proposal-item").first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("J2: approving a proposal makes cards live with version history", async ({
    page,
  }) => {
    await signIn(page, userA.email, userA.password)
    await page.goto(`/projects/${userASlug}`)
    await expect(page.getByTestId("proposal-item").first()).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId("proposal-item").first().click()
    await expect(page.getByTestId("approve-proposal").first()).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId("approve-proposal").first().click()
    await expect(page.getByTestId("board-card").first()).toBeVisible({
      timeout: 15_000,
    })

    await page.getByTestId("board-card").first().click()
    await expect(page.getByTestId("history-tab")).toBeVisible()
    await page.getByTestId("history-tab").click()
    await expect(page.getByText(/v1/)).toBeVisible()
  })

  test("J3: closing a card freezes it; follow-up creates a replacement", async ({
    page,
  }) => {
    await signIn(page, userA.email, userA.password)
    await page.goto(`/projects/${userASlug}`)
    await expect(page.getByTestId("board-card").first()).toBeVisible({
      timeout: 15_000,
    })

    await page.getByTestId("board-card").first().click()
    await expect(page.getByTestId("close-card")).toBeVisible()
    await page.getByTestId("close-card").click()
    await expect(
      page.getByText("This card is closed and read-only.")
    ).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(500)
    await expect(page.getByTestId("closed-card").first()).toBeVisible({
      timeout: 10_000,
    })

    await page.goto(`/projects/${userASlug}/chat`)
    await runPrompt(
      page,
      "add gift cards to the loyalty program alongside the existing cards"
    )
    await expect(page.getByText(/Generated \d+ story cards/)).toBeVisible({
      timeout: 15_000,
    })

    await page.goto(`/projects/${userASlug}`)
    await expect(page.getByTestId("proposal-item").first()).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId("proposal-item").first().click()
    await expect(page.getByTestId("approve-proposal").first()).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId("approve-proposal").first().click()
    await expect(page.getByTestId("board-card").first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("J4: cross-org isolation — User B cannot see User A's project", async ({
    page,
  }) => {
    await signIn(page, TEST_USER_B.email, TEST_USER_B.password)
    await expect(page).toHaveURL(/dashboard|projects/, { timeout: 10_000 })
    await page.goto("/projects")
    await expect(page.getByRole("heading", { name: "Boards" })).toBeVisible()

    await expect(page.getByText(`Loyalty ${userASlug}`)).not.toBeVisible({
      timeout: 3000,
    })

    await page.goto(`/projects/${userASlug}`)
    await expect(page.getByRole("heading")).not.toHaveText(/Loyalty/, {
      timeout: 10_000,
    })
    await expect(page.getByTestId("board-card")).toHaveCount(0, {
      timeout: 10_000,
    })
  })
})
