import { test, expect, type Page, type Download } from "@playwright/test"
import {
  TEST_USER,
  TEST_USER_B,
  TEST_USER_ID,
  GRAPH_PROJECT_SLUG,
  C1_ID,
  C2_ID,
} from "./seed"

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
  // A fresh zero-project user may be redirected to /onboarding by the
  // first-run guard before the post-verification landing renders.
  await expect(page).toHaveURL(/dashboard|projects|onboarding/, {
    timeout: 15_000,
  })
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/dashboard|projects|onboarding/, {
    timeout: 10_000,
  })
  // First-run guard (Phase 3, 03-04): a zero-project user lands on
  // /onboarding — dismiss it for the session so legacy journeys start from
  // /projects. Users with projects never hit this branch.
  if (/onboarding/.test(page.url())) {
    await page.getByTestId("onboarding-start").click()
    await page.getByTestId("onboarding-skip").click()
    await expect(page).toHaveURL(/projects/, { timeout: 10_000 })
  }
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

async function readDownloadText(download: Download): Promise<string> {
  const stream = await download.createReadStream()
  if (!stream) return ""
  const chunks: string[] = []
  for await (const chunk of stream) chunks.push(chunk.toString("utf-8"))
  return chunks.join("")
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

    // The first-run onboarding guard (Phase 3, 03-04) redirects a fresh user
    // with zero projects to /onboarding. Dismiss it for the session so the
    // legacy board-creation flow runs (deterministic: the guard always fires
    // for a zero-project user, so the welcome step is guaranteed to render).
    await page.goto("/onboarding")
    await expect(page.getByTestId("onboarding-welcome")).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId("onboarding-start").click()
    await expect(page.getByTestId("onboarding-template")).toBeVisible()
    await page.getByTestId("onboarding-skip").click()
    await expect(page).toHaveURL(/projects/)

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

test.describe.serial("phase 2", () => {
  test("J1: graph renders seeded nodes and edges; filters, impact, and drawer work", async ({
    page,
  }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/projects/${GRAPH_PROJECT_SLUG}?view=graph`)

    await expect(page.getByTestId("view-switcher-graph")).toBeVisible()
    await expect(page.getByTestId("graph-canvas")).toBeVisible({
      timeout: 15_000,
    })

    // 2 epics + 5 cards from the seed fixture
    const nodes = page.locator('[data-testid^="graph-node-"]')
    await expect(nodes).toHaveCount(7)

    // One edge per type is guaranteed by the fixture: 2 dependency,
    // 7 hierarchy (5 containment + parent epic + card relation), 1 evolution
    const dependencyEdges = page.locator('[data-edge-type="dependency"]')
    const hierarchyEdges = page.locator('[data-edge-type="hierarchy"]')
    const evolutionEdges = page.locator('[data-edge-type="evolution"]')
    await expect(dependencyEdges).toHaveCount(2)
    await expect(hierarchyEdges).toHaveCount(7)
    await expect(evolutionEdges).toHaveCount(1)

    // Toggle the dependency filter off: dependency edges drop to 0 while
    // the other types stay, then restore.
    await page.getByTestId("edge-filter-dependency").click()
    await expect.poll(() => dependencyEdges.count()).toBe(0)
    await expect(hierarchyEdges).toHaveCount(7)
    await expect(evolutionEdges).toHaveCount(1)
    await page.getByTestId("edge-filter-dependency").click()
    await expect.poll(() => dependencyEdges.count()).toBe(2)

    // Arm impact and select C2: reverse dependency traversal marks
    // {C2, C3, C4} — the banner appears with the card title.
    await page.getByTestId("impact-toggle").click()
    await page.getByTestId(`graph-node-${C2_ID}`).click()
    const banner = page.getByTestId("impact-banner")
    await expect(banner).toBeVisible()
    await expect(banner).toContainText(
      "Showing impact of Loyalty points ledger"
    )
    await expect(page.locator('[data-impact="true"]')).toHaveCount(3)

    // The node click also opened the CardDrawer; close it so the canvas is
    // clickable again, then Clear the impact highlight.
    await page.getByRole("button", { name: "✕" }).click()
    await page.getByTestId("impact-clear").click()
    await expect(banner).toBeHidden()
    await expect(page.locator('[data-impact="true"]')).toHaveCount(0)

    // Clicking a plain card node opens the CardDrawer with its title.
    await page.getByTestId(`graph-node-${C1_ID}`).click()
    await expect(page.getByTestId("copy-link")).toBeVisible()
    await expect(page.getByTestId("card-drawer-title")).toHaveText(
      "Enrollment form"
    )
  })

  test("J2: comments, @mentions, and SSE live updates", async ({ page }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/projects/${GRAPH_PROJECT_SLUG}?view=graph`)

    await page.getByTestId(`graph-node-${C1_ID}`).click()
    await expect(page.getByTestId("comment-input")).toBeVisible({
      timeout: 10_000,
    })

    // Live indicator reports open (SSE connection established).
    await expect(page.getByTestId("live-indicator")).toBeVisible()
    await expect
      .poll(
        () => page.getByTestId("live-indicator").getAttribute("data-status"),
        { timeout: 15_000 }
      )
      .toBe("open")

    // Typing @ opens the mention picker with the seeded member.
    await page.getByTestId("comment-input").click()
    await page.getByTestId("comment-input").pressSequentially("@")
    await expect(page.getByTestId("mention-picker")).toBeVisible({
      timeout: 5_000,
    })
    await expect(
      page.getByTestId(`mention-option-${TEST_USER_ID}`)
    ).toBeVisible()

    // Selecting a mention inserts "@E2E User " into the composer.
    await page.getByTestId(`mention-option-${TEST_USER_ID}`).click()
    const inputValue = await page.getByTestId("comment-input").inputValue()
    expect(inputValue).toContain("@E2E User")

    // Append a message after the mention (keeps the mention id registered).
    await page.getByTestId("comment-input").pressSequentially("check this")
    await page.getByTestId("comment-post").click()
    await expect(page.getByTestId("comment-item").first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("comment-mention")).toContainText("@E2E User")

    // SSE: post a second comment via the API (simulating another user).
    const API_URL = process.env.VITE_API_URL ?? "http://localhost:3001"
    const res = await page.request.post(
      `${API_URL}/api/cards/${C1_ID}/comments?project=${GRAPH_PROJECT_SLUG}`,
      { data: { body: "Live comment from API", mentions: [] } }
    )
    expect(res.ok()).toBeTruthy()

    // Without any reload, the new-comments-pill appears and the list refetches.
    await expect(page.getByTestId("new-comments-pill")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText("Live comment from API")).toBeVisible({
      timeout: 10_000,
    })
  })

  test("J3: export downloads CSV, JSON, and Markdown for the fixture board", async ({
    page,
  }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/projects/${GRAPH_PROJECT_SLUG}`)

    const exportMenu = page.getByTestId("export-menu")
    await expect(exportMenu).toBeVisible()
    await expect(exportMenu).toBeEnabled()

    // CSV: header row + a card title
    const csvDl = page.waitForEvent("download")
    await exportMenu.click()
    await page.getByTestId("export-csv").click()
    const csvText = await readDownloadText(await csvDl)
    expect(csvText).toContain("title,slug,status,priority,is_closed")
    expect(csvText).toContain("Enrollment form")

    // JSON: parses with nodes (>= 5) and a dependency edge
    const jsonDl = page.waitForEvent("download")
    await exportMenu.click()
    await page.getByTestId("export-json").click()
    const jsonText = await readDownloadText(await jsonDl)
    const parsed = JSON.parse(jsonText) as {
      nodes: unknown[]
      edges: Array<{ type: string }>
    }
    expect(parsed.nodes.length).toBeGreaterThanOrEqual(5)
    expect(parsed.edges.some((edge) => edge.type === "dependency")).toBe(true)

    // Markdown: project title, card titles, and the closed marker
    const mdDl = page.waitForEvent("download")
    await exportMenu.click()
    await page.getByTestId("export-markdown").click()
    const mdText = await readDownloadText(await mdDl)
    expect(mdText).toContain("# Graph Demo")
    expect(mdText).toContain("Redemption flow")
    expect(mdText).toContain("Legacy rewards v1")
    expect(mdText).toContain("(closed)")
  })

  test("J4: chat history persists and board replies approve inline", async ({
    page,
  }) => {
    await signIn(page, TEST_USER.email, TEST_USER.password)
    await page.goto(`/projects/${GRAPH_PROJECT_SLUG}/chat`)
    await runPrompt(page, "Add a referral program")

    await expect(page.getByTestId("chat-board-reply").first()).toBeVisible({
      timeout: 15_000,
    })
    await page.getByTestId("approve-proposal").first().click()
    await expect(page.getByTestId("proposal-status").first()).toContainText(
      "approved",
      { timeout: 15_000 }
    )

    await page.reload()
    await expect(page.getByText("Add a referral program")).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId("chat-board-reply").first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
