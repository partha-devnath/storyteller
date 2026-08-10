import ReactMarkdown from "react-markdown"

const BUILT_IN_KEYS = new Set(["description", "acceptanceCriteria"])

export function CardSections({
  sections,
  cardSections,
}: {
  sections?: Record<string, string> | null
  cardSections?: { key: string; label: string; builtIn?: boolean }[]
}) {
  if (!sections || Object.keys(sections).length === 0) return null

  const labels: Record<string, string> = {}
  const builtIn: Set<string> = new Set(BUILT_IN_KEYS)
  for (const s of cardSections ?? []) {
    labels[s.key] = s.label
    if (s.builtIn) builtIn.add(s.key)
  }

  const entries = Object.entries(sections).filter(([key]) => !builtIn.has(key))
  if (entries.length === 0) return null

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {labels[key] ?? key}
          </p>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{value}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}
