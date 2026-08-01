import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import * as schema from "@workspace/schemas"

const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })

export async function closeDb(): Promise<void> {
  await client.end()
}
