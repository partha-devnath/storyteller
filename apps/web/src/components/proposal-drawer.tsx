import { useState } from "react"
import { Link } from "react-router"
import ReactMarkdown from "react-markdown"
import {
  useProposal,
  useApproveProposal,
  useRejectProposal,
} from "@/hooks/use-proposals"
import { Button, buttonVariants } from "@workspace/ui/components/button"

export function ProposalDrawer({
  proposalId,
  open,
  onClose,
  projectSlug,
}: {
  proposalId: string
  open: boolean
  onClose: () => void
  projectSlug: string
}) {
  const { data } = useProposal(open ? proposalId : undefined, projectSlug)
  const approve = useApproveProposal(projectSlug)
  const reject = useRejectProposal(projectSlug)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  if (!open || !data) return null

  const change = data.changes.find((c) => c.changeType === "create")
  if (!change) return null

  const newData = change.newData as Record<string, unknown>
  const title = String(newData.title ?? "Untitled")
  const description = String(newData.description ?? "")
  const criteria = Array.isArray(newData.acceptanceCriteria)
    ? (newData.acceptanceCriteria as string[])
    : []
  const priority = String(newData.priority ?? "medium")
  const status = String(newData.status ?? "backlog")

  function close() {
    setRejecting(false)
    setReason("")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-input bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn uppercase">
                proposed
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {priority} · {status}
              </span>
            </div>
            <p
              className="mt-1 text-lg leading-snug font-bold tracking-tight"
              data-testid="proposal-drawer-title"
            >
              {title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/projects/${projectSlug}/proposals?proposal=${proposalId}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open in chat
            </Link>
            <Button size="sm" variant="ghost" onClick={close}>
              ✕
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          )}
          {criteria.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Acceptance criteria
              </p>
              <ul className="space-y-1 text-sm">
                {criteria.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">☐</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {change.conflictFlags.length > 0 && (
            <div className="mt-4 space-y-1 text-sm text-destructive">
              {change.conflictFlags.map((f, i) => (
                <p key={i}>⚠ {f.summary}</p>
              ))}
            </div>
          )}
          {change.relationSummary.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Relations
              </p>
              <ul className="space-y-1 text-sm">
                {change.relationSummary.map((r, i) => (
                  <li key={i}>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      {r.type}
                    </span>{" "}
                    {r.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
          <Button
            size="sm"
            data-testid="approve-proposal"
            disabled={approve.isPending}
            onClick={() => approve.mutate(proposalId, { onSuccess: close })}
          >
            {approve.isPending ? "Approving..." : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejecting((r) => !r)}
          >
            Reject
          </Button>
          {rejecting && (
            <>
              <input
                className="min-w-32 flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={reject.isPending}
                onClick={() =>
                  reject.mutate(
                    { id: proposalId, reason: reason || undefined },
                    { onSuccess: close }
                  )
                }
              >
                {reject.isPending ? "Rejecting..." : "Confirm"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
