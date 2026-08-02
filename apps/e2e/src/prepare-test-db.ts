import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createTestDatabase } from "./db"

const STATE_FILE = fileURLToPath(new URL("../.e2e-state.json", import.meta.url))

const sourceUrl = process.env.SOURCE_DATABASE_URL

if (!sourceUrl) {
  throw new Error(
    "SOURCE_DATABASE_URL environment variable is required. The playwright webServer for the API sets it from DATABASE_URL."
  )
}

const testUrl = await createTestDatabase(sourceUrl)

process.env.DATABASE_URL = testUrl

const { runMigrations } = await import("@workspace/db")
await runMigrations()

const { seedTestData } = await import("./seed")
await seedTestData()

writeFileSync(STATE_FILE, JSON.stringify({ testDatabaseUrl: testUrl }), "utf-8")

console.log(`E2E test database created, migrated, and seeded at ${testUrl}`)
