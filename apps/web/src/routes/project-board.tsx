import { lazy, Suspense, useCallback, useState } from "react"
import { useParams, useSearchParams } from "react-router"
import { Plus } from "lucide-react"
import { useProject, useProposedCards } from "@/hooks/use-projects"
import {
  useCards,
  useMoveCard,
  type CommentItem,
  type BoardCard,
} from "@/hooks/use-cards"
import { useProjectEvents } from "@/hooks/use-project-events"
import { useExport, type ExportFormat } from "@/hooks/use-export"
import { useBoardStore } from "@/stores/board-store"
import { KanbanBoard, type BoardFilters } from "@/components/kanban"
import { BoardToolbar } from "@/components/board-toolbar"
import { ClosedRail } from "@/components/closed-rail"
import { CardDrawer } from "@/components/card-drawer"
import { ProposalDrawer } from "@/components/proposal-drawer"
import { ProjectTabs } from "@/components/project-tabs"
import { LiveIndicator } from "@/components/live-indicator"
import { ViewSwitcher } from "@/components/view-switcher"
import { ExportMenu } from "@/components/export-menu"
import { CreateCardForm } from "@/components/create-card-form"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

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
  const { data: proposedCards } = useProposedCards(slug)
  const [filters, setFilters] = useState<BoardFilters>({
    priority: "",
    query: "",
  })
  const [createOpen, setCreateOpen] = useState(false)
  const moveCard = useMoveCard(slug ?? "")
  const defaultColumns = useBoardStore((s) => s.columns)
  const columns = projectDetail?.project.columns?.length
    ? projectDetail.project.columns
    : defaultColumns
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeProposal, setActiveProposal] = useState<{
    proposalId: string
    changeId?: string
  } | null>(null)
  const [liveComment, setLiveComment] = useState<{
    cardId: string
    comment: CommentItem
  } | null>(null)
  const [exportError, setExportError] = useState(false)
  const events = useProjectEvents(slug, {
    onCommentCreated: (payload) => setLiveComment(payload),
  })
  const { exportBoard } = useExport(slug ?? "")

  async function handleExport(format: ExportFormat) {
    setExportError(false)
    try {
      await exportBoard(format)
    } catch {
      setExportError(true)
    }
  }

  const handleMoveCard = useCallback(
    (cardId: string, status: string) => moveCard.mutate({ cardId, status }),
    [moveCard]
  )
  const handleSelectCard = useCallback(
    (card: BoardCard) => setActiveCardId(card.id),
    []
  )

  return (
    <div className="space-y-4">
      <ProjectTabs slug={slug ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
            {projectDetail?.project.name}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {cards?.length ?? 0} cards ·{" "}
            {cards?.filter((c) => c.isClosed).length ?? 0} closed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewSwitcher />
          <LiveIndicator status={events.status} onRetry={events.reconnect} />
        </div>
      </div>

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
              key={slug}
              projectSlug={slug}
              onSelectCard={(id) => setActiveCardId(id)}
            />
          )}
        </Suspense>
      ) : (
        <>
          <BoardToolbar filters={filters} onChange={setFilters} />
          <div className="mb-1 flex items-center justify-end gap-2">
            {exportError && (
              <p className="text-xs text-destructive">
                Export failed. Please try again.
              </p>
            )}
            <Button
              size="sm"
              data-testid="board-create-card"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              Create card
            </Button>
            <ExportMenu
              disabled={!cards || cards.length === 0}
              onExport={handleExport}
            />
          </div>
          {isLoading || !cards ? (
            <p className="text-sm text-muted-foreground">Loading board...</p>
          ) : (
            <KanbanBoard
              cards={cards}
              columns={columns}
              proposedCards={proposedCards}
              filters={filters}
              onMove={handleMoveCard}
              onSelectCard={handleSelectCard}
              onOpenProposal={(proposalId, changeId) =>
                setActiveProposal({ proposalId, changeId })
              }
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

      {activeCardId && (
        <CardDrawer
          cardId={activeCardId}
          open={Boolean(activeCardId)}
          onClose={() => setActiveCardId(null)}
          projectSlug={slug ?? ""}
          orgId={projectDetail?.project.orgId}
          liveComment={liveComment}
          cardSections={projectDetail?.project.cardSections}
        />
      )}

      {activeProposal && (
        <ProposalDrawer
          proposalId={activeProposal.proposalId}
          changeId={activeProposal.changeId}
          open={Boolean(activeProposal)}
          onClose={() => setActiveProposal(null)}
          projectSlug={slug ?? ""}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="create-card-dialog">
          <DialogHeader>
            <DialogTitle>Create a card</DialogTitle>
          </DialogHeader>
          {slug && <CreateCardForm projectSlug={slug} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
