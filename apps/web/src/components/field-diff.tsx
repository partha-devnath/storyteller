import { useMemo } from "react"
import { DiffPanel } from "./diff-panel"
import { cn } from "@workspace/ui/lib/utils"

type FieldValue = {
  title: string
  description: string
  acceptanceCriteria: string[]
  status?: string
  priority?: string
}

function valueOf(v: unknown): FieldValue {
  if (!v || typeof v !== "object") {
    return { title: "", description: "", acceptanceCriteria: [] }
  }
  const o = v as Record<string, unknown>
  return {
    title: String(o.title ?? ""),
    description: String(o.description ?? ""),
    acceptanceCriteria: Array.isArray(o.acceptanceCriteria)
      ? (o.acceptanceCriteria as string[])
      : [],
    status: o.status ? String(o.status) : undefined,
    priority: o.priority ? String(o.priority) : undefined,
  }
}

function changedFields(before: FieldValue, after: FieldValue): string[] {
  const fields: string[] = []
  if (before.title !== after.title) fields.push("title")
  if (before.description !== after.description) fields.push("description")
  if (
    JSON.stringify(before.acceptanceCriteria) !==
    JSON.stringify(after.acceptanceCriteria)
  ) {
    fields.push("acceptance criteria")
  }
  if (before.status !== after.status) fields.push("status")
  if (before.priority !== after.priority) fields.push("priority")
  return fields
}

function ListDiff({ before, after }: { before: string[]; after: string[] }) {
  const rows = useMemo(() => {
    const max = Math.max(before.length, after.length)
    const out: { key: string; added?: string; removed?: string }[] = []
    for (let i = 0; i < max; i++) {
      const b = before[i]
      const a = after[i]
      if (b === a) continue
      out.push({ key: `${i}`, removed: b, added: a })
    }
    return out
  }, [before, after])

  if (rows.length === 0) return null
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="space-y-0.5">
          {r.removed !== undefined && (
            <div className="rounded bg-destructive/10 px-2 py-1 text-xs text-muted line-through decoration-destructive/50">
              − {r.removed}
            </div>
          )}
          {r.added !== undefined && (
            <div className="rounded bg-success/10 px-2 py-1 text-xs text-foreground">
              + {r.added}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function FieldDiff({
  before,
  after,
}: {
  before: unknown
  after: unknown
}) {
  const b = valueOf(before)
  const a = valueOf(after)
  const changed = changedFields(b, a)

  if (changed.length === 0) {
    return (
      <p data-testid="field-diff" className="text-xs text-muted-foreground">
        No field changes.
      </p>
    )
  }

  return (
    <div className="space-y-3" data-testid="field-diff">
      {changed.includes("title") && (
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Title
          </p>
          <div className="space-y-0.5">
            {b.title && (
              <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-muted line-through decoration-destructive/50">
                {b.title}
              </p>
            )}
            {a.title && (
              <p className="rounded bg-success/10 px-2 py-1 text-xs font-medium text-foreground">
                {a.title}
              </p>
            )}
          </div>
        </div>
      )}

      {changed.includes("description") && (
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Description
          </p>
          <DiffPanel before={b.description} after={a.description} />
        </div>
      )}

      {changed.includes("acceptance criteria") && (
        <div>
          <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Acceptance criteria
          </p>
          <ListDiff
            before={b.acceptanceCriteria}
            after={a.acceptanceCriteria}
          />
        </div>
      )}

      {(changed.includes("status") || changed.includes("priority")) && (
        <div className="flex flex-wrap gap-3">
          {changed.includes("status") && (
            <div>
              <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Status
              </p>
              <p className="text-xs">
                <span
                  className={cn(
                    "mr-2 rounded px-1.5 py-0.5 line-through",
                    "bg-destructive/10 text-muted decoration-destructive/50"
                  )}
                >
                  {b.status ?? "—"}
                </span>
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-foreground">
                  {a.status ?? "—"}
                </span>
              </p>
            </div>
          )}
          {changed.includes("priority") && (
            <div>
              <p className="mb-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Priority
              </p>
              <p className="text-xs">
                <span
                  className={cn(
                    "mr-2 rounded px-1.5 py-0.5 line-through",
                    "bg-destructive/10 text-muted decoration-destructive/50"
                  )}
                >
                  {b.priority ?? "—"}
                </span>
                <span className="rounded bg-success/10 px-1.5 py-0.5 text-foreground">
                  {a.priority ?? "—"}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
