import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import ReactMarkdown from "react-markdown"
import {
  useCardDetail,
  useCardVersions,
  useCardSimilar,
  useCardComments,
} from "@/hooks/use-cards"
import { useOrgMembers } from "@/hooks/use-orgs"
import { useProject } from "@/hooks/use-projects"
import { cardKey } from "@/lib/card-key"
import { timeAgo } from "@/lib/time-ago"
import { DiffPanel } from "@/components/diff-panel"
import { CardSections } from "@/components/card-sections"
import { CommentList } from "@/components/comment-list"
import { CommentComposer } from "@/components/comment-composer"
import { buttonVariants } from "@workspace/ui/components/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

const CHANGE_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  close: "Closed",
}

type Tab = "details" | "history" | "relations" | "similar"

export function CardDetailPage() {
  const { slug, cardSlug } = useParams<{ slug: string; cardSlug: string }>()
  const { data: detail, isLoading } = useCardDetail(cardSlug, slug)
  const { data: versions } = useCardVersions(cardSlug, slug)
  const { data: similar } = useCardSimilar(cardSlug, slug)
  const { data: comments } = useCardComments(cardSlug, slug)
  const { data: projectDetail } = useProject(slug)
  const orgId = projectDetail?.project.orgId ?? ""
  const { data: orgMembers } = useOrgMembers(orgId, {
    enabled: Boolean(orgId),
  })
  const [tab, setTab] = useState<Tab>("details")
  const [versionPair, setVersionPair] = useState<[number, number]>([0, 1])

  const cardVersions = versions ?? []
  const latest = cardVersions[versionPair[0]]
  const previous = cardVersions[versionPair[1]]

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of orgMembers ?? []) map[m.userId] = m.name
    return map
  }, [orgMembers])

  if (isLoading) {
    return (
      <div className="space-y-4 p-6" data-testid="card-detail-loading">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    )
  }

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "history", label: "History" },
    { key: "relations", label: "Relations" },
    { key: "similar", label: "Similar" },
  ]

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
              {card.isClosed ? "closed" : card.status.replace("_", " ")}
            </span>
            {latest && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold">
                v{latest.versionNo}
              </span>
            )}
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

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={t.key === "history" ? "history-tab" : undefined}
            className={cn(
              "rounded-t-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors",
              tab === t.key
                ? "border border-b-0 border-border bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {tab === "details" && (
          <div className="space-y-4">
            {card.description && (
              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Description
                </p>
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border/60 bg-card p-4">
                  <ReactMarkdown>{card.description}</ReactMarkdown>
                </div>
              </div>
            )}

            {card.acceptanceCriteria.length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Acceptance criteria
                </p>
                <ul className="space-y-1 rounded-xl border border-border/60 bg-card p-4 text-sm">
                  {card.acceptanceCriteria.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">☐</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {card.customFields && Object.keys(card.customFields).length > 0 && (
              <div>
                <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  Custom fields
                </p>
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-card p-4">
                  {Object.entries(card.customFields).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <CardSections
              sections={card.sections}
              cardSections={projectDetail?.project.cardSections}
            />

            <div>
              <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Comments
              </p>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <CommentList
                  comments={comments ?? []}
                  memberNameById={memberNameById}
                  onReply={() => {}}
                />
                {!card.isClosed && (
                  <div className="mt-4">
                    <CommentComposer
                      cardId={card.id}
                      projectSlug={slug ?? ""}
                      orgId={orgId}
                      onPosted={() => {}}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            {cardVersions.length > 1 && (
              <div data-testid="version-diff">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] font-semibold">
                    v{latest?.versionNo} vs v{previous?.versionNo}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    {cardVersions.length > 1 &&
                      cardVersions.slice(0, -1).map((v, i) => (
                        <button
                          key={v.id}
                          onClick={() => setVersionPair([i, i + 1])}
                          className={cn(
                            "rounded-md border px-2 py-1 font-mono text-[11px] font-semibold transition-colors",
                            versionPair[0] === i
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          v{v.versionNo}→v{cardVersions[i + 1]?.versionNo}
                        </button>
                      ))}
                  </div>
                </div>
                <DiffPanel
                  before={`${previous?.title ?? ""}\n\n${previous?.description ?? ""}`}
                  after={`${latest?.title ?? ""}\n\n${latest?.description ?? ""}`}
                />
              </div>
            )}

            <div>
              <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Version history
              </p>
              <div className="space-y-1.5">
                {cardVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No history.</p>
                ) : (
                  cardVersions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        const idx = cardVersions.findIndex((x) => x.id === v.id)
                        if (idx < cardVersions.length - 1) {
                          setVersionPair([idx, idx + 1])
                        }
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        versionPair[0] ===
                          cardVersions.findIndex((x) => x.id === v.id)
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 bg-card hover:border-border"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold">
                          v{v.versionNo}
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                          {CHANGE_LABELS[v.changeType] ?? v.changeType}
                        </span>
                        <span className="line-clamp-1 text-muted-foreground">
                          {v.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {v.createdAt ? timeAgo(v.createdAt) : ""}
                        {v.createdBy
                          ? ` · ${memberNameById[v.createdBy] ?? v.createdBy}`
                          : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "relations" && (
          <div className="space-y-2 text-sm">
            {detail.relations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No relations.</p>
            ) : (
              detail.relations.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-border/60 bg-card p-2 text-sm"
                >
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    {r.type}
                  </span>
                  <span className="ml-2 font-mono text-xs">
                    {r.sourceCardId} → {r.targetCardId}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "similar" && (
          <div data-testid="similar-list" className="space-y-2 text-sm">
            {!similar || similar.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No similar cards found.
              </p>
            ) : (
              similar.map((s) => (
                <div
                  key={s.cardId}
                  className="rounded-md border border-border/60 bg-card p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(s.similarity * 100)}%
                    </span>
                  </div>
                  {s.isClosed && (
                    <span className="text-[10px] text-muted-foreground">
                      🔒 closed
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
