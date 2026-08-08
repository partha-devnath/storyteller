import type { BoardCard } from "@/hooks/use-cards"
import { priorityClasses, priorityLabel } from "@/lib/priority"

export function BoardCard({
  card,
  isClosed,
  dragProps,
  onClick,
}: {
  card: BoardCard
  isClosed: boolean
  dragProps?: {
    ref: (element: Element | null) => void
    isDragging: boolean
    listeners?: Record<string, unknown>
  }
  onClick?: () => void
}) {
  const prio = priorityLabel(card.priority)
  return (
    <div
      data-testid="board-card"
      ref={dragProps?.ref}
      {...(dragProps?.listeners ?? {})}
      onClick={onClick}
      className={`group flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:-translate-y-px hover:border-border hover:shadow-lg ${
        isClosed
          ? "border-dashed border-destructive/40 bg-card/60 opacity-70"
          : ""
      } ${dragProps?.isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/80">
          {card.id}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
            isClosed
              ? "border border-border bg-muted text-muted-foreground"
              : "border border-warn/40 bg-warn/10 text-warn"
          }`}
        >
          {isClosed ? "frozen" : "proposed"}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          ›
        </span>
      </div>
      <p className="text-[13.5px] leading-snug font-semibold text-foreground">
        {card.title}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {card.acceptanceCriteriaCount > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {card.acceptanceCriteriaCount} criteria
          </span>
        )}
        {prio && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${priorityClasses[card.priority] ?? priorityClasses.low}`}
          >
            {prio}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : ""}
        </span>
      </div>
    </div>
  )
}
