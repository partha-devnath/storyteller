import { lazy, Suspense, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { useProject } from "@/hooks/use-projects"
import { useProposals } from "@/hooks/use-proposals"
import { Sparkles } from "lucide-react"
import { useCards, useMoveCard, type CommentItem } from "@/hooks/use-cards"
import { useProjectEvents } from "@/hooks/use-project-events"
import { useExport, type ExportFormat } from "@/hooks/use-export"
import { useBoardStore } from "@/stores/board-store"
import { KanbanBoard } from "@/components/kanban"
import { ClosedRail } from "@/components/closed-rail"
import { CardDrawer } from "@/components/card-drawer"
import { ProposalReview } from "@/components/proposal-review"
import { ProjectTabs } from "@/components/project-tabs"
import { LiveIndicator } from "@/components/live-indicator"
import { ExportMenu } from "@/components/export-menu"
import { Button } from "@workspace/ui/components/button"

const GraphView = lazy(() =>
  import("@/components/graph-view").then((mod) => ({
    default: mod.GraphView,
  }))
)

export function ProjectBoardPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get("view") ?? "board"
  const { data: projectDetail, isLoading } = useProject(slug)
  const { data: cards } = useCards(slug)
  const { data: proposals } = useProposals(slug)
  const pendingCount =
    proposals?.filter((p) => p.status === "pending").length ?? 0
  const moveCard = useMoveCard(slug ?? "")
  const defaultColumns = useBoardStore((s) => s.columns)
  const columns = projectDetail?.project.columns?.length
    ? projectDetail.project.columns
    : defaultColumns
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
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

  return (
    <div className="space-y-4">
      <ProjectTabs slug={slug ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
            {projectDetail?.project.name}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {cards?.length ?? 0} cards · {pendingCount} proposed ·{" "}
            {cards?.filter((c) => c.isClosed).length ?? 0} frozen
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator status={events.status} onRetry={events.reconnect} />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-3 py-2.5">
        <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold tracking-wide text-primary">
          <Sparkles className="size-4" />
          AI Instruction
        </span>
        <span className="hidden shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[11px] text-foreground/80 md:inline">
          forks a new branch off the active board
        </span>
        <input
          aria-label="AI instruction"
          placeholder="Ask the engine to draft, split, or evolve a requirement…"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <Button
          size="sm"
          onClick={() => navigate(`/projects/${slug ?? ""}/chat`)}
        >
          Run
        </Button>
      </div>

      {pendingCount > 0 && (
        <div
          data-testid="proposal-banner"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5"
        >
          <span className="font-mono text-[13px] font-bold text-warn">
            {pendingCount}
          </span>
          <span className="text-[13px] text-foreground/80">
            AI proposals awaiting your review.
          </span>
          <span className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                document
                  .getElementById("proposal-review")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Review &amp; approve
            </Button>
          </span>
        </div>
      )}

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
              <div className="mb-4 flex items-center justify-end gap-2">
                {exportError && (
                  <p className="text-xs text-destructive">
                    Export failed. Please try again.
                  </p>
                )}
                <ExportMenu
                  disabled={!cards || cards.length === 0}
                  onExport={handleExport}
                />
              </div>
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
          orgId={projectDetail?.project.orgId}
          liveComment={liveComment}
        />
      )}
    </div>
  )
}
