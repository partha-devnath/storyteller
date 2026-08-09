export function isEmptyClarifying(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const v = value as { kind?: unknown; questions?: unknown }
  return (
    v.kind === "clarifying" &&
    Array.isArray(v.questions) &&
    v.questions.length === 0
  )
}
