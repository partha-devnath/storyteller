import { useMemo } from "react"
import { Link, useParams } from "react-router"
import { useCardDetail, useCardVersions } from "@/hooks/use-cards"
import { cardKey } from "@/lib/card-key"
import { timeAgo } from "@/lib/time-ago"
import { SideBySideDiff } from "@/components/side-by-side-diff"
import { buttonVariants } from "@workspace/ui/components/button"
import { ChevronLeft } from "lucide-react"

const CHANGE_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  close: "Closed",
}

export function CardDetailPage() {
  const { slug, cardSlug } = useParams<{ slug: string; cardSlug: string }>()
  const { data: detail } = useCardDetail(cardSlug, slug)
  const { data: versions } = useCardVersions(cardSlug, slug)

  const latest = versions?.[0]
  const previous = versions?.[1]

  const summary = useMemo(() => {
    if (!latest) return null
    return {
      label: CHANGE_LABELS[latest.changeType] ?? latest.changeType,
      versionNo: latest.versionNo,
      createdAt: latest.createdAt,
      title: latest.title,
    }
  }, [latest])

  if (!detail) {
    return (
      <div className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm text-muted-foreground">Card not found.</p>
        <Link
          to={`/projects/${slug ?? ""}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to board
        </Link>
      </div>
    )
  }

  const card = detail.card
  const cardVersions = versions ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        to={`/projects/${slug ?? ""}`}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to board
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] font-semibold text-muted-foreground">
              {cardKey(card.keyNo)}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold capitalize ${
                card.isClosed
                  ? "border border-destructive/40 bg-destructive/10 text-destructive"
                  : "border border-primary/40 bg-primary/10 text-primary"
              }`}
            >
              {card.isClosed ? "frozen" : card.status.replace("_", " ")}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {card.title}
          </h1>
        </div>
        <Link
          to={`/projects/${slug ?? ""}?card=${card.slug}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Open on board
        </Link>
      </div>

      {summary && (
        <div
          className="rounded-xl border border-border bg-card p-4"
          data-testid="change-summary"
        >
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Latest change
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">
              v{summary.versionNo}
            </span>
            <span className="font-semibold">{summary.label}</span>
            <span className="text-muted-foreground">{summary.title}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.createdAt ? timeAgo(summary.createdAt) : ""}
            {latest?.createdBy ? ` · by ${latest.createdBy}` : ""}
          </p>
        </div>
      )}

      {cardVersions.length > 1 && (
        <div data-testid="version-diff">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">
              v{latest?.versionNo} vs v{previous?.versionNo}
            </h2>
            <span className="text-xs text-muted-foreground">
              {previous ? timeAgo(previous.createdAt) : ""}
            </span>
          </div>
          <SideBySideDiff
            before={previous?.description ?? ""}
            after={latest?.description ?? ""}
          />
        </div>
      )}

      {card.description && (
        <div>
          <h2 className="mb-2 text-[15px] font-semibold">Description</h2>
          <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
            {card.description}
          </div>
        </div>
      )}

      {card.acceptanceCriteria.length > 0 && (
        <div>
          <h2 className="mb-2 text-[15px] font-semibold">
            Acceptance criteria
          </h2>
          <ul className="space-y-1 rounded-xl border border-border bg-card p-4 text-sm">
            {card.acceptanceCriteria.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">☐</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-[15px] font-semibold">Version history</h2>
        <div className="space-y-1.5">
          {cardVersions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history.</p>
          ) : (
            cardVersions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold">
                    v{v.versionNo}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    {CHANGE_LABELS[v.changeType] ?? v.changeType}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {v.createdAt ? timeAgo(v.createdAt) : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
