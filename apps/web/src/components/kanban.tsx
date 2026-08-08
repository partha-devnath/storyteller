import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd(event: DragEndEvent) {
    const sourceId = String(event.active.id)
    const targetKey = String(event.over?.id ?? "")
    const card = openCards.find((c) => c.id === sourceId)
    if (!card || !targetKey.startsWith("col-")) return
    const columnKey = targetKey.replace(/^col-/, "")
    if (card.status !== columnKey) {
      onMove(card.id, columnKey)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-3 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
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
    </DndContext>
  )
}
