import { useDroppable, useDraggable } from "@dnd-kit/react"
import type { BoardCard } from "@/hooks/use-cards"

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
    <div
      ref={ref}
      data-testid="board-card"
      onClick={() => onSelectCard(card)}
      className={`rounded-lg border bg-background p-3 text-left text-sm shadow-sm ${
        isDragging ? "opacity-40" : ""
      } cursor-pointer transition-shadow hover:shadow-md`}
    >
      <p className="font-medium">{card.title}</p>
      {card.acceptanceCriteriaCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {card.acceptanceCriteriaCount} criteria
        </p>
      )}
    </div>
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
      className={`flex min-h-[120px] flex-col gap-2 rounded-lg border bg-muted/20 p-2 ${
        isDropTarget ? "ring-2 ring-ring" : ""
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <span className="text-xs text-muted-foreground">{cards.length}</span>
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
