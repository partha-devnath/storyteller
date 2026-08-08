import { useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import {
  useCardDetail,
  useCardVersions,
  useCardSimilar,
  useCardComments,
  useCloseCard,
  type CommentItem,
} from "@/hooks/use-cards"
import { useOrgMembers } from "@/hooks/use-orgs"
import { DiffPanel } from "./diff-panel"
import { CommentList } from "./comment-list"
import { CommentComposer } from "./comment-composer"
import { Button } from "@workspace/ui/components/button"

type Tab = "details" | "history" | "relations" | "similar"

export function CardDrawer({
  cardId,
  open,
  onClose,
  projectSlug,
  orgId,
  liveComment,
}: {
  cardId: string
  open: boolean
  onClose: () => void
  projectSlug: string
  orgId?: string
  liveComment?: { cardId: string; comment: CommentItem } | null
}) {
  const { data: detail } = useCardDetail(open ? cardId : undefined, projectSlug)
  const { data: versions } = useCardVersions(
    open ? cardId : undefined,
    projectSlug
  )
  const { data: similar } = useCardSimilar(
    open ? cardId : undefined,
    projectSlug
  )
  const { data: comments } = useCardComments(
    open ? cardId : undefined,
    projectSlug
  )
  const { data: orgMembers } = useOrgMembers(orgId ?? "", {
    enabled: Boolean(orgId),
  })
  const closeCard = useCloseCard(projectSlug)
  const [tab, setTab] = useState<Tab>("details")
  const [copied, setCopied] = useState(false)
  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null)
  const [newCommentCount, setNewCommentCount] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)
  const lastLiveCommentId = useRef<string | null>(null)

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of orgMembers ?? []) map[m.userId] = m.name
    return map
  }, [orgMembers])

  // Count remote comment.created events addressed to the open card.
  // setState runs inside a deferred callback (setTimeout) so the update is
  // not synchronous with the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!liveComment || liveComment.cardId !== cardId) return
    if (lastLiveCommentId.current === liveComment.comment.id) return
    lastLiveCommentId.current = liveComment.comment.id
    const id = window.setTimeout(() => {
      setNewCommentCount((n) => n + 1)
    }, 0)
    return () => window.clearTimeout(id)
  }, [liveComment, cardId])

  if (!open || !detail) return null

  const card = detail.card
  const slug = card.slug

  function handleJump() {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setNewCommentCount(0)
  }

  async function copyLink() {
    const url = `/project/${projectSlug}/card/${slug}`
    try {
      await navigator.clipboard.writeText(window.location.origin + url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "history", label: "History" },
    { key: "relations", label: "Relations" },
    { key: "similar", label: "Similar" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-input bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {card.id}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                  card.isClosed
                    ? "border border-destructive/40 bg-destructive/10 text-destructive"
                    : "border border-warn/40 bg-warn/10 text-warn"
                }`}
              >
                {card.isClosed ? "frozen" : card.status}
              </span>
            </div>
            <p
              className="mt-1 text-lg leading-snug font-bold tracking-tight"
              data-testid="card-drawer-title"
            >
              {card.title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!card.isClosed && (
              <Button
                size="sm"
                variant="outline"
                data-testid="close-card"
                disabled={closeCard.isPending}
                onClick={() => closeCard.mutate({ cardId: card.id })}
              >
                {closeCard.isPending ? "Closing..." : "Close card"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={copyLink}
              data-testid="copy-link"
            >
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        {card.isClosed && (
          <div className="border-b border-dashed border-destructive/40 bg-destructive/10 px-5 py-2 text-xs text-destructive">
            🔒 This card is closed and read-only.
          </div>
        )}

        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={t.key === "history" ? "history-tab" : undefined}
              className={`rounded-t-md px-3 py-1.5 font-mono text-[11px] font-medium tracking-wide uppercase ${
                tab === t.key
                  ? "border border-b-0 border-border bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "details" && (
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{card.description ?? ""}</ReactMarkdown>
              </div>
              {card.acceptanceCriteria.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Acceptance criteria
                  </p>
                  <ul className="space-y-1 text-sm">
                    {card.acceptanceCriteria.map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">☐</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {card.customFields &&
                Object.keys(card.customFields).length > 0 && (
                  <div>
                    <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Custom fields
                    </p>
                    <div className="flex flex-wrap gap-1">
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
              {detail.attachments.length > 0 && (
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Attachments
                  </p>
                  <ul className="space-y-1 text-sm">
                    {detail.attachments.map((a) => (
                      <li key={a.id}>
                        <a href={a.url} className="text-primary underline">
                          {a.originalName}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <p className="font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    Comments
                  </p>
                  {newCommentCount > 0 && (
                    <span
                      data-testid="new-comments-pill"
                      className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                    >
                      {newCommentCount === 1
                        ? "1 new comment"
                        : `${newCommentCount} new comments`}
                    </span>
                  )}
                  {newCommentCount > 0 && (
                    <Button variant="ghost" size="xs" onClick={handleJump}>
                      Jump
                    </Button>
                  )}
                </div>
                <div ref={listRef}>
                  <CommentList
                    comments={comments ?? []}
                    memberNameById={memberNameById}
                    onReply={(c) => setReplyTarget(c)}
                  />
                </div>
                {!card.isClosed && (
                  <div className="mt-4">
                    <CommentComposer
                      cardId={cardId}
                      projectSlug={projectSlug}
                      orgId={orgId ?? ""}
                      parentId={replyTarget?.id}
                      replyingToName={replyTarget?.userName}
                      onCancelReply={() => setReplyTarget(null)}
                      onPosted={() => setReplyTarget(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-2">
              {!versions || versions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history.</p>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{v.versionNo}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                        {v.changeType}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.title}
                    </p>
                  </div>
                ))
              )}
              {versions && versions.length > 1 && (
                <div className="mt-3">
                  <p className="mb-1 text-sm font-semibold">
                    v{versions.length} vs v{versions.length - 1}
                  </p>
                  <DiffPanel
                    before={versions[versions.length - 1].description ?? ""}
                    after={versions[0].description ?? ""}
                  />
                </div>
              )}
            </div>
          )}

          {tab === "relations" && (
            <div className="space-y-2 text-sm">
              {detail.relations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No relations.</p>
              ) : (
                detail.relations.map((r) => (
                  <div key={r.id} className="rounded-md border p-2 text-sm">
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                      {r.type}
                    </span>
                    <span className="ml-2">
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
                  <div key={s.cardId} className="rounded-md border p-2">
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
    </div>
  )
}
