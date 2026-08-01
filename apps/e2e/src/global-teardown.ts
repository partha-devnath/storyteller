import { readFileSync, unlinkSync } from "node:fs"
import { dropTestDatabase } from "./db"

const STATE_FILE = new URL("../.e2e-state.json", import.meta.url).pathname

async function globalTeardown() {
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as {
      testDatabaseUrl: string
    }

    await dropTestDatabase(state.testDatabaseUrl)
    unlinkSync(STATE_FILE)

    console.log(`E2E test database dropped: ${state.testDatabaseUrl}`)
  } catch {
    console.warn("No E2E state file found, skipping teardown.")
  }
}

export default globalTeardown
