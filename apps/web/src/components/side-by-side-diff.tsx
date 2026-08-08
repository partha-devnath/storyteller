import { useMemo } from "react"
import { diffLines } from "diff"

type Row = {
  key: string
  type: "add" | "del" | "same"
  left: string | null
  right: string | null
}

function toRows(before: string, after: string): Row[] {
  const parts = diffLines(before ?? "", after ?? "")
  const rows: Row[] = []
  for (const part of parts) {
    if (part.added) {
      rows.push({
        key: `a${rows.length}`,
        type: "add",
        left: null,
        right: part.value,
      })
    } else if (part.removed) {
      rows.push({
        key: `d${rows.length}`,
        type: "del",
        left: part.value,
        right: null,
      })
    } else {
      for (const line of part.value.split("\n")) {
        rows.push({
          key: `s${rows.length}`,
          type: "same",
          left: line,
          right: line,
        })
      }
    }
  }
  return rows
}

export function SideBySideDiff({
  before,
  after,
}: {
  before: string
  after: string
}) {
  const rows = useMemo(() => toRows(before, after), [before, after])

  return (
    <div
      data-testid="side-by-side-diff"
      className="overflow-x-auto rounded-xl border border-border bg-card"
    >
      <div className="grid grid-cols-2 border-b border-border">
        <p className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Before
        </p>
        <p className="border-l border-border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          After
        </p>
      </div>
      <div className="grid grid-cols-2">
        <div className="min-w-0">
          {rows.map((r) => (
            <div
              key={r.key}
              className={`min-h-[1.6em] px-3 py-0.5 text-[12.5px] leading-relaxed ${
                r.type === "del"
                  ? "bg-destructive/10 text-muted line-through decoration-destructive/50"
                  : ""
              } ${r.left === "" ? "min-h-[1.6em]" : ""}`}
            >
              {r.type === "add" ? "" : r.left}
            </div>
          ))}
        </div>
        <div className="min-w-0 border-l border-border">
          {rows.map((r) => (
            <div
              key={r.key}
              className={`min-h-[1.6em] px-3 py-0.5 text-[12.5px] leading-relaxed ${
                r.type === "add"
                  ? "bg-success/10 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {r.type === "del" ? "" : r.right}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
