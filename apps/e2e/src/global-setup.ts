import { writeFileSync } from "node:fs"
import { createTestDatabase } from "./db"
import { runMigrations } from "@workspace/db"
import { seedTestData } from "./seed"

const STATE_FILE = new URL("../.e2e-state.json", import.meta.url).pathname

async function globalSetup() {
  const sourceUrl = process.env.DATABASE_URL

  if (!sourceUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required. Copy apps/api/.env.example to apps/api/.env and configure it, then run E2E tests."
    )
  }

  const testUrl = await createTestDatabase(sourceUrl)

  process.env.DATABASE_URL = testUrl

  await runMigrations()

  await seedTestData()

  writeFileSync(
    STATE_FILE,
    JSON.stringify({ testDatabaseUrl: testUrl }),
    "utf-8"
  )

  console.log(`E2E test database created, migrated, and seeded at ${testUrl}`)
}

export default globalSetup
