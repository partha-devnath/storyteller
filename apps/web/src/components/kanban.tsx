import { DragDropProvider } from "@dnd-kit/react"
import type { BoardCard } from "@/hooks/use-cards"
import { BoardColumn } from "./board-column"

export function KanbanBoard({
  cards,
  columns,
  onMove,
  onSelectCard,
}: {
  cards: BoardCard[]
  columns: { key: string; title: string }[]
  onMove: (cardId: string, status: string) => void
  onSelectCard: (card: BoardCard) => void
}) {
  const openCards = cards.filter((c) => !c.isClosed)

  function handleDragEnd(event: {
    operation: {
      source: { data: { cardId?: string; status?: string } } | null
      target: { data: { columnKey?: string } } | null
    }
  }) {
    const sourceId = event.operation.source?.data?.cardId
    const targetKey = event.operation.target?.data?.columnKey
    const sourceStatus = event.operation.source?.data?.status
    if (!sourceId || !targetKey || !sourceStatus) return
    if (sourceStatus !== targetKey) {
      onMove(sourceId, targetKey)
    }
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {columns.map((col) => (
          <BoardColumn
            key={col.key}
            columnKey={col.key}
            title={col.title}
            cards={openCards.filter((c) => c.status === col.key)}
            onSelectCard={onSelectCard}
          />
        ))}
      </div>
    </DragDropProvider>
  )
}
