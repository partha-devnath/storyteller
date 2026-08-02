import { db } from "@workspace/db"
import {
  user as userSchema,
  account as accountSchema,
} from "@workspace/schemas"
import { hashPassword } from "@better-auth/utils/password"

export const TEST_USER = {
  email: "e2e@test.com",
  password: "TestPass123!",
  name: "E2E User",
}

export const TEST_USER_B = {
  email: "e2e-b@test.com",
  password: "TestPass123!",
  name: "E2E User B",
}

async function insertUser(user: {
  email: string
  password: string
  name: string
}): Promise<void> {
  const passwordHash = await hashPassword(user.password)

  const userId = crypto.randomUUID()
  const now = new Date()

  await db.insert(userSchema).values({
    id: userId,
    name: user.name,
    email: user.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(accountSchema).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  })
}

export async function seedTestData(): Promise<void> {
  await insertUser(TEST_USER)
  await insertUser(TEST_USER_B)
}
