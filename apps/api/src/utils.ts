export function generateId(): string {
  return crypto.randomUUID().split("-").join("").slice(0, 16)
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
