import type { BoardCard } from "@/hooks/use-cards"
import { priorityClasses, priorityLabel } from "@/lib/priority"
import { cardKey } from "@/lib/card-key"
import { timeAgo } from "@/lib/time-ago"
import { cn } from "@workspace/ui/lib/utils"

const statusChip: Record<string, string> = {
  backlog: "border border-border bg-muted text-muted-foreground",
  todo: "border border-primary/40 bg-primary/10 text-primary",
  in_progress: "border border-warn/40 bg-warn/10 text-warn",
  review: "border border-purple-500/40 bg-purple-500/10 text-purple-400",
  done: "border border-success/40 bg-success/10 text-success",
}

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
      className={cn(
        "group flex cursor-pointer flex-col gap-2.5 rounded-xl border border-border/80 bg-card p-3.5 text-left shadow-sm transition-all duration-150",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-lg",
        isClosed && "border-dashed border-destructive/40 bg-card/60 opacity-70",
        dragProps?.isDragging && "scale-[1.03] rotate-1 opacity-50 shadow-2xl"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/80">
          {cardKey(card.keyNo)}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize",
            isClosed
              ? "border border-destructive/40 bg-destructive/10 text-destructive"
              : (statusChip[card.status] ?? statusChip.backlog)
          )}
        >
          {isClosed ? "frozen" : card.status.replace("_", " ")}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          ›
        </span>
      </div>

      <p className="line-clamp-2 text-[13.5px] leading-snug font-semibold text-foreground">
        {card.title}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
        {prio && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-bold",
              priorityClasses[card.priority] ?? priorityClasses.low
            )}
          >
            {prio}
          </span>
        )}
        {card.acceptanceCriteriaCount > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {card.acceptanceCriteriaCount} criteria
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {card.updatedAt ? timeAgo(card.updatedAt) : ""}
        </span>
      </div>
    </div>
  )
}
