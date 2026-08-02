import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

function getTestDatabaseUrl(): string {
  const source = process.env.DATABASE_URL
  if (!source) return ""
  const url = new URL(source)
  const dbName = url.pathname.replace(/^\//, "")
  url.pathname = `/${dbName}_e2e`
  return url.toString()
}

function getSourceDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? ""
}

export default defineConfig({
  testDir: "./src",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalTeardown: resolve(__dirname, "src/global-teardown.ts"),
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      cwd: resolve(__dirname, "../web"),
      timeout: 30_000,
    },
    {
      command: "bun run ../e2e/src/prepare-test-db.ts && bun run dev",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      cwd: resolve(__dirname, "../api"),
      env: {
        SOURCE_DATABASE_URL: getSourceDatabaseUrl(),
        DATABASE_URL: getTestDatabaseUrl(),
        AI_PROVIDER: "mock",
        AI_RATE_LIMIT_MAX: "100",
        AUTH_RATE_LIMIT_MAX: "500",
      },
      timeout: 60_000,
    },
  ],
})
