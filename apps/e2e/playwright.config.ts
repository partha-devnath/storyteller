import { defineConfig, devices } from "@playwright/test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function getTestDatabaseUrl(): string {
  try {
    const stateFile = resolve(__dirname, ".e2e-state.json")
    const state = JSON.parse(readFileSync(stateFile, "utf-8")) as {
      testDatabaseUrl: string
    }
    return state.testDatabaseUrl
  } catch {
    return process.env.DATABASE_URL ?? ""
  }
}

export default defineConfig({
  testDir: "./src",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: resolve(__dirname, "src/global-setup.ts"),
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
      command: "bun run dev",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      cwd: resolve(__dirname, "../api"),
      env: {
        DATABASE_URL: getTestDatabaseUrl(),
      },
      timeout: 30_000,
    },
  ],
})
