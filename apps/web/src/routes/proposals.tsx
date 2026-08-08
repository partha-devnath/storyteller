import { useParams, useNavigate } from "react-router"
import { Sparkles } from "lucide-react"
import { useProposals } from "@/hooks/use-proposals"
import { useProject } from "@/hooks/use-projects"
import { ProposalReview } from "@/components/proposal-review"
import { ProjectTabs } from "@/components/project-tabs"
import { Button } from "@workspace/ui/components/button"

export function ProposalsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: proposals } = useProposals(slug)
  const { data: projectDetail } = useProject(slug)
  const pendingCount =
    proposals?.filter((p) => p.status === "pending").length ?? 0

  return (
    <div className="space-y-4">
      <ProjectTabs slug={slug ?? ""} />

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
        </div>
      )}

      <div className="max-w-2xl">
        <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
          {projectDetail?.project.name} — Proposals
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Draft, split, or evolve requirements with AI, then review what ships
          to the board.
        </p>
      </div>

      {slug && <ProposalReview projectSlug={slug} />}
    </div>
  )
}
