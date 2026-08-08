import { useState } from "react"
import {
  useProposals,
  useProposal,
  useApproveProposal,
  useRejectProposal,
} from "@/hooks/use-proposals"
import { Button } from "@workspace/ui/components/button"
import { GraphView } from "./graph-view"

export function ProposalReview({
  projectSlug,
  initialProposalId,
}: {
  projectSlug: string
  initialProposalId?: string | null
}) {
  const { data: proposals } = useProposals(projectSlug)
  const approve = useApproveProposal(projectSlug)
  const reject = useRejectProposal(projectSlug)
  const [expandedId, setExpandedId] = useState<string | null>(
    initialProposalId ?? null
  )
  const [graphId, setGraphId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const pending = proposals?.filter((p) => p.status === "pending") ?? []
  const expanded = useProposal(expandedId ?? undefined, projectSlug)

  if (pending.length === 0) {
    return null
  }

  return (
    <div
      className="rounded-lg border p-3"
      data-testid="proposal-review"
      id="proposal-review"
    >
      <p className="mb-2 text-sm font-semibold">Proposals to review</p>
      <div className="space-y-2">
        {pending.map((p) => (
          <div
            key={p.id}
            className="rounded-md border p-2"
            data-testid="proposal-item"
          >
            <button
              className="flex w-full items-center justify-between text-left text-sm"
              onClick={() => {
                setExpandedId(expandedId === p.id ? null : p.id)
                setGraphId(null)
              }}
            >
              <span className="line-clamp-1">{p.instruction}</span>
              <span className="ml-2 shrink-0 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-700">
                {p.changeCount} changes
              </span>
            </button>

            {expandedId === p.id && expanded.data && (
              <div className="mt-2 space-y-2 border-t pt-2">
                {expanded.data.changes.map((change) => (
                  <div
                    key={change.id}
                    className="rounded border bg-muted/20 p-2 text-xs"
                  >
                    <span className="mr-2 rounded-full bg-muted px-1.5 py-0.5 font-medium uppercase">
                      {change.changeType}
                    </span>
                    {change.changeType === "create" && (
                      <span>New: {String(change.newData.title ?? "")}</span>
                    )}
                    {change.changeType === "update" && (
                      <span>Update card {change.targetCardId}</span>
                    )}
                    {change.changeType === "close" && (
                      <span>Close card {change.targetCardId}</span>
                    )}
                    {change.conflictFlags.length > 0 && (
                      <div className="mt-1 text-red-600 dark:text-red-400">
                        {change.conflictFlags.map((f, i) => (
                          <p key={i}>⚠ {f.summary}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="proposal-graph-toggle"
                    onClick={() => setGraphId(graphId === p.id ? null : p.id)}
                  >
                    {graphId === p.id ? "Hide graph" : "View graph"}
                  </Button>
                  <Button
                    size="sm"
                    data-testid="approve-proposal"
                    disabled={approve.isPending}
                    onClick={() =>
                      approve.mutate(p.id, {
                        onSuccess: () => {
                          setExpandedId(null)
                          window.location.reload()
                        },
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRejectingId(rejectingId === p.id ? null : p.id)
                    }
                  >
                    Reject
                  </Button>
                </div>

                {graphId === p.id && (
                  <div data-testid="proposal-graph">
                    <GraphView
                      projectSlug={projectSlug}
                      proposalId={p.id}
                      compact
                      onSelectCard={() => {}}
                    />
                  </div>
                )}

                {rejectingId === p.id && (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
                      placeholder="Reason (optional)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={reject.isPending}
                      onClick={() =>
                        reject.mutate(
                          { id: p.id, reason: rejectReason || undefined },
                          {
                            onSuccess: () => {
                              setRejectingId(null)
                              setRejectReason("")
                              window.location.reload()
                            },
                          }
                        )
                      }
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
