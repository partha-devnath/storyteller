import { test, expect, type Page } from "@playwright/test"
import {
  TEST_USER,
  TEST_USER_C,
  TEST_USER_D,
  FREE_ORG_ID,
  PRO_ORG_ID,
  E2E_ORG_ID,
} from "./seed"

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
  // Clear any existing session so the login form renders (a logged-in user
  // hitting /login is redirected to /dashboard by PublicRoute).
  await page.context().clearCookies()
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

  test("B3: downgrade flow flips the pro org to free", async ({ page }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/orgs/${PRO_ORG_ID}/billing`)

    // Pro state: current-plan shows "Pro"; the free card carries the
    // downgrade CTA (no badge — the badge sits on the pro card).
    await expect(page.getByTestId("current-plan")).toContainText("Pro", {
      timeout: 10_000,
    })
    const downgradeCta = page.getByTestId("plan-select-free")
    await expect(downgradeCta).toBeVisible()

    // Cancel path: the dialog opens and closes with no plan change.
    await downgradeCta.click()
    const dialog = page.getByTestId("plan-change-dialog")
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Downgrade to Free?")
    await page.getByTestId("plan-change-cancel").click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId("current-plan")).toContainText("Pro")
    await expect(page.getByTestId("plan-select-free")).toBeVisible()

    // Confirm path: success toast + the plan flips to Free (useDowngrade
    // invalidated the billing query and the page refetched server truth).
    await page.getByTestId("plan-select-free").click()
    await expect(dialog).toBeVisible()
    await page.getByTestId("plan-change-confirm").click()
    await expect(page.getByText("You're now on the Free plan.")).toBeVisible({
      timeout: 10_000,
    })
    // Dismiss the dialog overlay before reading the page beneath it.
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("current-plan")).toContainText("Free", {
      timeout: 10_000,
    })
    await expect(
      page.getByTestId("plan-card-free").getByTestId("current-plan-badge")
    ).toBeVisible()
  })

  test("O1: onboarding — fresh users hit /onboarding; blank template and skip work", async ({
    page,
  }) => {
    // Fresh user C: zero orgs + zero projects → the protected-route first-run
    // guard redirects to /onboarding with the base welcome state.
    await signIn(
      page,
      TEST_USER_C.email,
      TEST_USER_C.password,
      /onboarding|dashboard|projects/
    )
    await expect(page).toHaveURL(/onboarding/, { timeout: 10_000 })
    const welcome = page.getByTestId("onboarding-welcome")
    await expect(welcome).toBeVisible()
    await expect(welcome).toContainText("Welcome to Storyteller")
    await page.getByTestId("onboarding-start").click()
    await expect(page.getByTestId("onboarding-template")).toBeVisible()

    // The blank template creates a project via POST /api/projects, which
    // requires org membership. User C has no orgs, so create one through the
    // API (same pattern as the A1 empty-org case) and reload so useOrgs picks
    // it up — the zero-project guard still fires and onboarding re-renders.
    const orgRes = await page.request.post(`${API_URL}/api/orgs`, {
      data: { name: "E2E User C Org" },
    })
    expect(orgRes.status()).toBe(201)
    await page.goto("/onboarding")
    await expect(page).toHaveURL(/onboarding/)
    await page.getByTestId("onboarding-start").click()
    await expect(page.getByTestId("onboarding-template")).toBeVisible()

    // Blank template creates the board and navigates to it. The testid anchor
    // lives on the template-card wrapper; click its "Use template" button.
    await page
      .getByTestId("onboarding-template-blank")
      .getByRole("button", { name: "Use template" })
      .click()
    await expect(page).toHaveURL(/projects\/.+/, { timeout: 15_000 })
    await expect(
      page.getByRole("heading", { name: "Untitled board" })
    ).toBeVisible({ timeout: 15_000 })

    // Fresh user D (skip path): lands on /projects with no re-redirect loop.
    await signIn(
      page,
      TEST_USER_D.email,
      TEST_USER_D.password,
      /onboarding|dashboard|projects/
    )
    await expect(page).toHaveURL(/onboarding/, { timeout: 10_000 })
    await page.getByTestId("onboarding-start").click()
    await expect(page.getByTestId("onboarding-template")).toBeVisible()
    await page.getByTestId("onboarding-skip").click()
    await expect(page).toHaveURL(/projects/, { timeout: 10_000 })
    // Settle window: the session skip flag prevents a re-redirect.
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/projects/)
  })

  test("A1: analytics renders seeded activity; empty state on a fresh org", async ({
    page,
  }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/orgs/${E2E_ORG_ID}/analytics`)

    // Stats: the seeded activity guarantees every total > 0.
    const statMetrics = [
      "cardsCreated",
      "proposalsApproved",
      "commentsPosted",
      "activeMembers",
    ] as const
    for (const metric of statMetrics) {
      const stat = page.getByTestId(`analytics-stat-${metric}`)
      await expect(stat).toBeVisible({ timeout: 10_000 })
      await expect
        .poll(
          async () =>
            Number((await stat.locator("p").first().textContent()) ?? "0"),
          { timeout: 10_000 }
        )
        .toBeGreaterThan(0)
    }

    // Charts: one svg per series, each with >= 1 bar carrying data-value.
    for (const metric of [
      "cardsCreated",
      "proposalsApproved",
      "commentsPosted",
    ] as const) {
      await expect(page.getByTestId(`analytics-chart-${metric}`)).toBeVisible()
      const bars = page.locator(`[data-testid^="analytics-bar-${metric}-"]`)
      expect(await bars.count()).toBeGreaterThanOrEqual(1)
      const values = await bars.evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-value"))
      )
      for (const v of values) expect(v).not.toBeNull()
    }

    // Empty case: a brand-new org has zero activity → empty state + CTA.
    const orgRes = await page.request.post(`${API_URL}/api/orgs`, {
      data: { name: "Empty Org" },
    })
    expect(orgRes.status()).toBe(201)
    const orgBody = (await orgRes.json()) as { data: { org: { id: string } } }
    await page.goto(`/orgs/${orgBody.data.org.id}/analytics`)
    const emptyCta = page.getByTestId("analytics-empty-cta")
    await expect(emptyCta).toBeVisible({ timeout: 10_000 })
    await emptyCta.click()
    await expect(page).toHaveURL(/projects/)
  })
})
