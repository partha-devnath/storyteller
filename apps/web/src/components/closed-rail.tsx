import type { BoardCard } from "@/hooks/use-cards"
import { useBoardStore } from "@/stores/board-store"
import { ChevronDown, Lock } from "lucide-react"

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
    <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-4">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 text-left"
        data-testid="closed-rail-toggle"
      >
        <Lock className="size-3.5 text-destructive" />
        <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          Frozen
        </span>
        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
          {closedCards.length}
        </span>
        <ChevronDown
          className={`ml-auto size-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
      {!collapsed && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {closedCards.length === 0 ? (
            <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
              No closed cards yet.
            </p>
          ) : (
            closedCards.map((card) => (
              <button
                key={card.id}
                data-testid="closed-card"
                onClick={() => onSelectCard(card)}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-destructive/40 bg-background px-3 py-2 text-left text-sm opacity-70 hover:opacity-100"
              >
                <span className="line-through decoration-destructive/60">
                  {card.title}
                </span>
                <span className="font-mono text-[10px] text-destructive">
                  frozen
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
