import { lazy, Suspense, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { useProject } from "@/hooks/use-projects"
import { useCards, useMoveCard } from "@/hooks/use-cards"
import { useBoardStore } from "@/stores/board-store"
import { KanbanBoard } from "@/components/kanban"
import { ClosedRail } from "@/components/closed-rail"
import { CardDrawer } from "@/components/card-drawer"
import { ProposalReview } from "@/components/proposal-review"
import { ViewSwitcher } from "@/components/view-switcher"

const GraphView = lazy(() =>
  import("@/components/graph-view").then((mod) => ({
    default: mod.GraphView,
  }))
)

export function ProjectBoardPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const view = searchParams.get("view") ?? "board"
  const { data: projectDetail, isLoading } = useProject(slug)
  const { data: cards } = useCards(slug)
  const moveCard = useMoveCard(slug ?? "")
  const defaultColumns = useBoardStore((s) => s.columns)
  const columns = projectDetail?.project.columns?.length
    ? projectDetail.project.columns
    : defaultColumns
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {projectDetail?.project.name}
        </h1>
        <span className="text-xs text-muted-foreground">
          {cards?.length ?? 0} cards
        </span>
      </div>

      <ViewSwitcher />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          {view === "graph" ? (
            <Suspense
              fallback={
                <div
                  className="h-64 animate-pulse rounded-lg bg-muted"
                  data-testid="graph-loading"
                />
              }
            >
              {slug && (
                <GraphView
                  projectSlug={slug}
                  onSelectCard={(id) => setActiveCardId(id)}
                />
              )}
            </Suspense>
          ) : (
            <>
              {isLoading || !cards ? (
                <p className="text-sm text-muted-foreground">
                  Loading board...
                </p>
              ) : (
                <KanbanBoard
                  cards={cards}
                  columns={columns}
                  onMove={(cardId, status) =>
                    moveCard.mutate({ cardId, status })
                  }
                  onSelectCard={(card) => setActiveCardId(card.id)}
                />
              )}
              {cards && (
                <ClosedRail
                  cards={cards}
                  onSelectCard={(card) => setActiveCardId(card.id)}
                />
              )}
            </>
          )}
        </div>

        {slug && <ProposalReview projectSlug={slug} />}
      </div>

      {activeCardId && (
        <CardDrawer
          cardId={activeCardId}
          open={Boolean(activeCardId)}
          onClose={() => setActiveCardId(null)}
          projectSlug={slug ?? ""}
        />
      )}
    </div>
  )
}
