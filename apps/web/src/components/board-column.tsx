import { memo } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import type { BoardCard } from "@/hooks/use-cards"
import { BoardCard as Card } from "./board-card"

const DraggableBoardCard = memo(function DraggableBoardCard({
  card,
  onSelectCard,
}: {
  card: BoardCard
  onSelectCard: (card: BoardCard) => void
}) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: card.id,
    data: { cardId: card.id, status: card.status },
  })
  return (
    <Card
      card={card}
      isClosed={card.isClosed}
      dragProps={{
        ref: (el: Element | null) => setNodeRef(el as HTMLElement | null),
        isDragging,
        listeners: {
          ...listeners,
          onPointerDown: (e: React.PointerEvent) => {
            e.stopPropagation()
            listeners?.onPointerDown?.(e)
          },
        },
      }}
      onClick={() => onSelectCard(card)}
    />
  )
})

export const BoardColumn = memo(function BoardColumn({
  columnKey,
  title,
  cards,
  isFiltered,
  onSelectCard,
}: {
  columnKey: string
  title: string
  cards: BoardCard[]
  isFiltered?: boolean
  onSelectCard: (card: BoardCard) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${columnKey}`,
    data: { columnKey },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${columnKey}`}
      className={`flex max-h-[calc(100vh-16rem)] w-80 min-w-80 flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-2.5 transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 px-1.5 py-1">
        <p className="text-[13px] font-bold tracking-wide text-foreground">
          {title}
        </p>
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
          {cards.length}
        </span>
      </div>
      <div className="flex min-h-[80px] flex-col gap-3 overflow-y-auto pr-1">
        {cards.length === 0 ? (
          <p className="p-3 text-center text-xs text-muted-foreground">
            {isFiltered ? "No cards match filter" : "No cards"}
          </p>
        ) : (
          cards.map((card) => (
            <DraggableBoardCard
              key={card.id}
              card={card}
              onSelectCard={onSelectCard}
            />
          ))
        )}
      </div>
    </div>
  )
})
