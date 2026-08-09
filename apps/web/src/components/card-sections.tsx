import ReactMarkdown from "react-markdown"

export function CardSections({
  sections,
  cardSections,
}: {
  sections?: Record<string, string> | null
  cardSections?: { key: string; label: string }[]
}) {
  if (!sections || Object.keys(sections).length === 0) return null

  const labels: Record<string, string> = {}
  for (const s of cardSections ?? []) labels[s.key] = s.label

  return (
    <div className="space-y-4">
      {Object.entries(sections).map(([key, value]) => (
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
