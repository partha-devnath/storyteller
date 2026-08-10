import { useCallback, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import type { BoardCard } from "@/hooks/use-cards"
import type { ProposedCard } from "@/hooks/use-projects"
import { BoardColumn } from "./board-column"
import { BoardCard as Card } from "./board-card"

export type BoardFilters = {
  priority: string
  query: string
}

export function KanbanBoard({
  cards,
  columns,
  proposedCards,
  filters,
  onMove,
  onSelectCard,
  onOpenProposal,
}: {
  cards: BoardCard[]
  columns: { key: string; title: string }[]
  proposedCards?: ProposedCard[]
  filters: BoardFilters
  onMove: (cardId: string, status: string) => void
  onSelectCard: (card: BoardCard) => void
  onOpenProposal?: (proposalId: string, changeId?: string) => void
}) {
  const openCards = cards.filter((c) => !c.isClosed)
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  )

  const matchesFilters = useCallback(
    (card: BoardCard) => {
      if (filters.priority && card.priority !== filters.priority) return false
      if (filters.query) {
        const q = filters.query.toLowerCase()
        return card.title.toLowerCase().includes(q)
      }
      return true
    },
    [filters]
  )

  const proposedMatches = useCallback(
    (card: ProposedCard) => {
      if (filters.priority && card.priority !== filters.priority) return false
      if (filters.query) {
        const q = filters.query.toLowerCase()
        return card.title.toLowerCase().includes(q)
      }
      return true
    },
    [filters]
  )

  function handleDragStart(event: DragStartEvent) {
    const card = openCards.find((c) => c.id === String(event.active.id))
    setActiveCard(card ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCard(null)}
    >
      <div className="[transform:rotateX(180deg)] overflow-x-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
        <div className="flex min-w-0 [transform:rotateX(180deg)] gap-4 pb-3">
          <div
            data-testid="column-proposed"
            className="flex max-h-[calc(100vh-16rem)] w-80 min-w-80 flex-col gap-3 rounded-xl border border-dashed border-warn/40 bg-warn/5 p-2.5"
          >
            <div className="flex shrink-0 items-center gap-2 px-1.5 py-1">
              <p className="text-[13px] font-bold tracking-wide text-warn">
                Proposed
              </p>
              <span className="rounded-full bg-warn/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn">
                {proposedCards?.length ?? 0}
              </span>
            </div>
            <div className="flex min-h-[80px] flex-col gap-3 overflow-y-auto pr-1">
              {!proposedCards || proposedCards.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  No proposed cards
                </p>
              ) : (
                proposedCards.filter(proposedMatches).map((card) => (
                  <div
                    key={card.id}
                    data-testid="proposed-card"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onOpenProposal?.(card.proposalId, card.changeId)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onOpenProposal?.(card.proposalId, card.changeId)
                      }
                    }}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-warn/40 bg-card/60 p-3.5 text-left transition-colors hover:border-warn/70 hover:bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-warn uppercase">
                        {card.changeType === "update" ? "update" : "proposed"}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground opacity-0 transition-opacity hover:opacity-100">
                        ›
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[13.5px] leading-snug font-semibold text-foreground">
                      {card.title}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {card.acceptanceCriteriaCount} criteria
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {columns.map((col) => (
            <BoardColumn
              key={col.key}
              columnKey={col.key}
              title={col.title}
              cards={openCards.filter(
                (c) => c.status === col.key && matchesFilters(c)
              )}
              isFiltered={filters.priority !== "" || filters.query !== ""}
              onSelectCard={onSelectCard}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <Card card={activeCard} isClosed={activeCard.isClosed} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
