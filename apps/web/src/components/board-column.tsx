import { useDroppable, useDraggable } from "@dnd-kit/react"
import type { BoardCard } from "@/hooks/use-cards"
import { BoardCard as Card } from "./board-card"

function DraggableBoardCard({
  card,
  onSelectCard,
}: {
  card: BoardCard
  onSelectCard: (card: BoardCard) => void
}) {
  const { ref, isDragging } = useDraggable({
    id: card.id,
    data: { cardId: card.id, status: card.status },
  })
  return (
    <Card
      card={card}
      isClosed={card.isClosed}
      dragProps={{ ref: ref as (el: Element | null) => void, isDragging }}
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
  const { ref, isDropTarget } = useDroppable({
    id: `col-${columnKey}`,
    data: { columnKey },
  })

  return (
    <div
      ref={ref}
      data-testid={`column-${columnKey}`}
      className={`flex min-h-[120px] flex-col gap-3 rounded-xl border border-border/60 bg-background/60 p-2 ${isDropTarget ? "ring-2 ring-ring" : ""}`}
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
