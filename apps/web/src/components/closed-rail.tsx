import type { BoardCard } from "@/hooks/use-cards"
import { useBoardStore } from "@/stores/board-store"

export function ClosedRail({
  cards,
  onSelectCard,
}: {
  cards: BoardCard[]
  onSelectCard: (card: BoardCard) => void
}) {
  const collapsed = useBoardStore((s) => s.closedRailCollapsed)
  const toggle = useBoardStore((s) => s.toggleClosedRail)
  const closedCards = cards.filter((c) => c.isClosed)

  return (
    <div className="mt-6 rounded-lg border border-dashed p-3">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between text-sm font-semibold"
        data-testid="closed-rail-toggle"
      >
        <span>🔒 Closed ({closedCards.length})</span>
        <span>{collapsed ? "Expand" : "Collapse"}</span>
      </button>
      {!collapsed && (
        <div className="mt-2 space-y-1">
          {closedCards.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No closed cards yet.
            </p>
          ) : (
            closedCards.map((card) => (
              <button
                key={card.id}
                data-testid="closed-card"
                onClick={() => onSelectCard(card)}
                className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-left text-sm opacity-70 hover:opacity-100"
              >
                <span>{card.title}</span>
                <span className="text-xs text-muted-foreground">
                  {card.updatedAt
                    ? new Date(card.updatedAt).toLocaleDateString()
                    : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
