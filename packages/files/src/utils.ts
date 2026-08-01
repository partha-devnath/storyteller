export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomUUID().split("-").join("").slice(0, 16)
  return `${timestamp}_${random}`
}
