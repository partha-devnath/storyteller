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
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {parts.map((part) => (
        <div
          key={part.id}
          className={`flex items-baseline gap-2 px-3 py-1 text-[13px] leading-relaxed ${
            part.added
              ? "bg-success/10"
              : part.removed
                ? "bg-destructive/10"
                : ""
          }`}
        >
          <span
            className={`w-5 shrink-0 text-right font-mono text-[10px] ${
              part.added
                ? "text-success"
                : part.removed
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {part.added ? "+" : part.removed ? "−" : " "}
          </span>
          <span
            className={
              part.added
                ? "text-foreground"
                : part.removed
                  ? "text-muted line-through decoration-destructive/50"
                  : "text-muted-foreground"
            }
          >
            {part.value}
          </span>
        </div>
      ))}
    </div>
  )
}
