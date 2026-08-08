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
  return (
    <div
      data-testid="board-card"
      ref={dragProps?.ref}
      {...(dragProps?.listeners ?? {})}
      onClick={onClick}
      className={`rounded-lg border bg-background p-3 text-left text-sm shadow-sm ${
        isClosed ? "opacity-60" : ""
      } ${dragProps?.isDragging ? "opacity-40" : ""} cursor-pointer transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{card.title}</p>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${priorityClasses[card.priority] ?? priorityClasses.low}`}
        >
          {priorityLabel(card.priority)}
        </span>
      </div>
      {card.acceptanceCriteriaCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {card.acceptanceCriteriaCount} criteria
        </p>
      )}
      {isClosed && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          🔒 Closed
        </p>
      )}
    </div>
  )
}
