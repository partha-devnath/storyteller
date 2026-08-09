import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

function secretKey(): Buffer {
  const secret = process.env.INTEGRATION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      "INTEGRATION_SECRET environment variable is required (min 16 chars)"
    )
  }
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32))
}

export function encryptConfig(
  plain: Record<string, string>
): Record<string, string> {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv)
  const data = Buffer.concat([
    cipher.update(JSON.stringify(plain), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  }
}

export function decryptConfig(
  stored: Record<string, string>
): Record<string, string> {
  if (!stored.iv || !stored.data) {
    throw new Error("Invalid stored credential config")
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    secretKey(),
    Buffer.from(stored.iv, "base64")
  )
  if (stored.tag) {
    decipher.setAuthTag(Buffer.from(stored.tag, "base64"))
  }
  const data = Buffer.concat([
    decipher.update(Buffer.from(stored.data, "base64")),
    decipher.final(),
  ])
  return JSON.parse(data.toString("utf8")) as Record<string, string>
}
