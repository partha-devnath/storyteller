import { db } from "@workspace/db"
import {
  user as userSchema,
  account as accountSchema,
} from "@workspace/schemas"

export const TEST_USER = {
  email: "e2e@test.com",
  password: "TestPass123!",
  name: "E2E User",
}

export async function seedTestData(): Promise<void> {
  const passwordHash = await Bun.password.hash(TEST_USER.password)

  const userId = crypto.randomUUID()
  const now = new Date()

  await db.insert(userSchema).values({
    id: userId,
    name: TEST_USER.name,
    email: TEST_USER.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(accountSchema).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "email",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  })
}
