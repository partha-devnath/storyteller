import { test, expect, type Page } from "@playwright/test"
import { TEST_USER, FREE_ORG_ID, E2E_ORG_ID } from "./seed"

const API_URL = process.env.VITE_API_URL ?? "http://localhost:3001"

/**
 * Sign in through the UI. The default landing regex matches the established
 * post-login URLs; onboarding journeys pass a regex that also allows
 * /onboarding (the first-run guard redirect fires before the app shell loads).
 */
async function signIn(
  page: Page,
  email: string,
  password: string,
  urlRegex: RegExp = /dashboard|projects/
): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(urlRegex, { timeout: 10_000 })
}

test.describe.serial("phase 3", () => {
  test("B1: billing page renders free plan and upgrade redirects to mock checkout", async ({
    page,
  }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/orgs/${E2E_ORG_ID}/billing`)

    // V2a/V2b: current-plan card shows "Free", the badge sits on the free
    // card, and the pro card exposes the upgrade CTA.
    await expect(page.getByTestId("current-plan")).toBeVisible()
    await expect(page.getByTestId("current-plan")).toContainText("Free")
    await expect(
      page.getByTestId("plan-card-free").getByTestId("current-plan-badge")
    ).toBeVisible()
    await expect(page.getByTestId("plan-card-pro")).toBeVisible()
    const upgrade = page.getByTestId("plan-select-pro")
    await expect(upgrade).toBeVisible()

    // V2c: usage meters render with a numeric data-pct (server-truth usage).
    // A 0% fill has a zero-width box, so assert the meter wrapper is visible
    // and parse the bar's data-pct attribute (the contract anchor).
    await expect(page.getByTestId("usage-section")).toBeVisible()
    for (const metric of [
      "projects",
      "members",
      "aiActions",
      "cards",
    ] as const) {
      await expect(page.getByTestId(`usage-meter-${metric}`)).toBeVisible()
      const bar = page.getByTestId(`usage-bar-${metric}`)
      const pct = await bar.getAttribute("data-pct")
      expect(pct).not.toBeNull()
      expect(Number(pct)).toBeGreaterThanOrEqual(0)
    }

    // Mock billing provider: the checkout mutation returns the mock-checkout
    // URL and the page performs the full-page redirect (no payment flow in
    // mock mode — the pro state for B3 comes from the seeded pro org).
    await upgrade.click()
    await expect(page).toHaveURL(/mock-checkout/, { timeout: 10_000 })

    // State unchanged — checkout was never completed.
    await page.goto(`/orgs/${E2E_ORG_ID}/billing`)
    await expect(page.getByTestId("usage-section")).toBeVisible()
    await expect(page.getByTestId("usage-bar-projects")).toBeVisible()
  })

  test("B2: plan-limit enforcement on the over-limit free org", async ({
    page,
  }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto("/projects")
    await expect(page.getByRole("heading", { name: "Boards" })).toBeVisible()

    // Select "Over Limit Org" via the org switcher — it sets selectedOrgId in
    // the board store so the shell's limit-banner resolves to the over-limit
    // org (the org-scoped /orgs/:orgId/projects route does not exist; the
    // switcher is the established org-selection mechanism).
    await page.getByRole("button", { name: /Over Limit Org/ }).click()
    await expect(page).toHaveURL("/projects")

    // V4b: banner reports the FIRST metric at its limit in LIMIT_METRICS order
    // (projects = 2/2; members = 5/5 and aiActions = 50/50 also saturate).
    const banner = page.getByTestId("limit-banner")
    await expect(banner).toBeVisible({ timeout: 10_000 })
    await expect(banner).toHaveAttribute("data-limit-metric", "projects")
    await expect(banner).toContainText(
      "You've reached your free project limit."
    )

    // V4a: "New board" is disabled (never hidden) with the limit tooltip.
    await expect(
      page.getByRole("main").getByRole("button", { name: "New board" })
    ).toBeDisabled()
    await expect(page.getByTestId("limit-tooltip").first()).toBeVisible()

    // V4b CTA navigates to Billing for the selected org.
    await page.getByTestId("limit-banner-upgrade").click()
    await expect(page).toHaveURL(`/orgs/${FREE_ORG_ID}/billing`)

    // V2c: projects meter at 100% with the destructive caption; aiActions also
    // at 100% (50 seeded proposals this month === the free aiActions limit).
    await expect(page.getByTestId("usage-bar-projects")).toHaveAttribute(
      "data-pct",
      "100",
      { timeout: 10_000 }
    )
    await expect(
      page.getByText("Limit reached — upgrade to Pro to continue.").first()
    ).toBeVisible()
    await expect(page.getByTestId("usage-bar-aiActions")).toHaveAttribute(
      "data-pct",
      "100"
    )

    // Full page load: meters still render server truth for the org in the URL.
    await page.goto(`/orgs/${FREE_ORG_ID}/billing`)
    await expect(page.getByTestId("usage-bar-projects")).toHaveAttribute(
      "data-pct",
      "100",
      { timeout: 10_000 }
    )

    // Server enforcement spot-check: POST /api/projects → 402 limit_reached
    // (page.request shares the signed-in browser context's session cookies).
    const res = await page.request.post(`${API_URL}/api/projects`, {
      data: { orgId: FREE_ORG_ID, name: "Too many" },
    })
    expect(res.status()).toBe(402)
    const body = (await res.json()) as { data: { code: string } }
    expect(body.data.code).toBe("limit_reached")
  })
})
