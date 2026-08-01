import { existsSync } from "node:fs"
import { join } from "node:path"
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"

export async function runMigrations() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required")
    process.exit(1)
  }

  const migrationsFolder = join(import.meta.dirname, "..", "migrations")

  if (!existsSync(migrationsFolder)) {
    console.log("No migrations folder found, skipping migrations")
    return
  }

  const migrateClient = postgres(connectionString, { max: 1 })
  const migrationDb = drizzle(migrateClient)

  try {
    await migrate(migrationDb, { migrationsFolder })
    console.log("Migrations completed successfully")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await migrateClient.end()
  }
}

const isDirectRun = import.meta.filename === process.argv[1]

if (isDirectRun) {
  await runMigrations()
}
