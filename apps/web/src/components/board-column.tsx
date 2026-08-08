import { useDraggable, useDroppable } from "@dnd-kit/core"
import type { BoardCard } from "@/hooks/use-cards"
import { BoardCard as Card } from "./board-card"

function DraggableBoardCard({
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
        ref: setNodeRef,
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
}

export function BoardColumn({
  columnKey,
  title,
  cards,
  onSelectCard,
}: {
  columnKey: string
  title: string
  cards: BoardCard[]
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
      className={`flex min-h-[120px] flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-2 transition-colors ${
        isOver ? "border-primary/60 bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-1.5 py-1">
        <p className="text-[13px] font-bold tracking-wide text-foreground">
          {title}
        </p>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {cards.length}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {cards.length === 0 ? "no cards" : ""}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="p-3 text-center text-xs text-muted-foreground">
          No cards
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
  )
}
