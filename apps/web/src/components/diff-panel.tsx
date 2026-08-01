import { useMemo } from "react"
import { diffLines } from "diff"

export function DiffPanel({
  before,
  after,
}: {
  before: string
  after: string
}) {
  const parts = useMemo(() => {
    return diffLines(before ?? "", after ?? "").map((part, i) => ({
      id: i,
      value: part.value,
      added: !!part.added,
      removed: !!part.removed,
    }))
  }, [before, after])

  if (!before && !after) {
    return (
      <p data-testid="diff-panel" className="text-xs text-muted-foreground">
        No changes.
      </p>
    )
  }

  return (
    <div
      data-testid="diff-panel"
      className="overflow-x-auto rounded-lg border bg-background"
    >
      <pre className="p-2 text-xs leading-relaxed">
        {parts.map((part) => (
          <span
            key={part.id}
            className={
              part.added
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : part.removed
                  ? "bg-red-500/10 text-red-700 dark:text-red-400"
                  : "text-muted-foreground"
            }
          >
            {part.value}
          </span>
        ))}
      </pre>
    </div>
  )
}
