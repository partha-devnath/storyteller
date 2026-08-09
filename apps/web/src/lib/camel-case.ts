export function camelCaseKey(label: string): string {
  const words = label
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  if (words.length === 0) return "section"
  const key =
    words[0] +
    words
      .slice(1)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("")
  return key.replace(/^[0-9]+/, "") || "section"
}
