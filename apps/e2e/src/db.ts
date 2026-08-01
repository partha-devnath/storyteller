import postgres from "postgres"

const STATE_FILE = new URL("../.e2e-state.json", import.meta.url).pathname

export function deriveTestDatabaseUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl)
  const dbName = url.pathname.replace(/^\//, "")
  url.pathname = `/${dbName}_e2e`
  return url.toString()
}

export async function createTestDatabase(sourceUrl: string): Promise<string> {
  const testUrl = deriveTestDatabaseUrl(sourceUrl)
  const url = new URL(sourceUrl)
  const testDbName = url.pathname.replace(/^\//, "") + "_e2e"

  url.pathname = "/postgres"
  const sql = postgres(url.toString(), { max: 1 })

  await sql.unsafe(
    `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${testDbName}' AND pid <> pg_backend_pid()`
  )
  await sql.unsafe(`DROP DATABASE IF EXISTS "${testDbName}"`)
  await sql.unsafe(`CREATE DATABASE "${testDbName}"`)
  await sql.end()

  return testUrl
}

export async function dropTestDatabase(testUrl: string): Promise<void> {
  const url = new URL(testUrl)
  const dbName = url.pathname.replace(/^\//, "")

  url.pathname = "/postgres"
  const sql = postgres(url.toString(), { max: 1 })

  await sql.unsafe(
    `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid()`
  )
  await sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}"`)
  await sql.end()
}

export { STATE_FILE }
