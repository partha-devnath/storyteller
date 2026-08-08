import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  useProposal,
  useApproveProposal,
  useRejectProposal,
} from "@/hooks/use-proposals"
import type { ChatMessageRow } from "@/hooks/use-chat"

function formatTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function BoardReply({
  proposalId,
  projectSlug,
}: {
  proposalId: string
  projectSlug: string
}) {
  const qc = useQueryClient()
  const { data } = useProposal(proposalId, projectSlug)
  const approve = useApproveProposal(projectSlug)
  const reject = useRejectProposal(projectSlug)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const status = data?.proposal.status

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["proposal"] })
    qc.invalidateQueries({ queryKey: ["proposals", projectSlug] })
  }

  if (!data) return null

  return (
    <div
      className="rounded-lg border bg-muted/20 p-3"
      data-testid="chat-board-reply"
    >
      <p className="text-sm font-medium">{data.proposal.instruction}</p>
      <div className="mt-2 space-y-1">
        {data.changes.map((change) => (
          <div
            key={change.id}
            className="rounded border bg-background px-2 py-1 text-xs"
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
          </div>
        ))}
      </div>
      {status && status !== "pending" && (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="proposal-status"
        >
          {status}
        </p>
      )}
      {status === "pending" && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            data-testid="approve-proposal"
            disabled={approve.isPending}
            onClick={() => approve.mutate(proposalId, { onSuccess: refresh })}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejecting((v) => !v)}
          >
            Reject
          </Button>
          {rejecting && (
            <div className="flex items-center gap-2">
              <input
                data-testid="reject-reason"
                className="w-40 rounded-md border bg-background px-2 py-1 text-xs"
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
                    {
                      onSuccess: () => {
                        setRejecting(false)
                        setReason("")
                        refresh()
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
  )
}

export function ChatThread({
  messages,
  projectSlug,
  onClarifyAnswer,
}: {
  messages: ChatMessageRow[]
  projectSlug: string
  onClarifyAnswer: (index: number, answers: string[]) => void
}) {
  const clarifyingIndex = useMemo(() => {
    let last = -1
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].kind === "clarifying" && messages[i].role === "ai") {
        last = i
      }
    }
    return last
  }, [messages])

  const [draftAnswers, setDraftAnswers] = useState<string[] | null>(null)
  const activeClarifying =
    clarifyingIndex >= 0 ? messages[clarifyingIndex] : null
  const answering = draftAnswers !== null

  function startAnswering() {
    if (!activeClarifying?.questions) return
    setDraftAnswers(activeClarifying.questions.map(() => ""))
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, i) => {
        if (message.kind === "prompt") {
          return (
            <div
              key={message.id}
              className="ml-auto flex max-w-[85%] flex-col items-end"
            >
              {message.mentions && message.mentions.length > 0 && (
                <div className="mb-1 flex flex-wrap justify-end gap-1">
                  {message.mentions.map((m) => (
                    <span
                      key={`${m.type}-${m.id}`}
                      className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary"
                    >
                      @{m.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="rounded-xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                {message.content}
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )
        }
        if (message.kind === "board" && message.proposalId) {
          return (
            <div
              key={message.id}
              className="mr-auto flex max-w-[85%] flex-col items-start"
            >
              {message.content && (
                <p className="mb-2 text-sm">{message.content}</p>
              )}
              <BoardReply
                proposalId={message.proposalId}
                projectSlug={projectSlug}
              />
              <span className="mt-1 text-[10px] text-muted-foreground">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )
        }
        if (message.kind === "clarifying" && message.questions) {
          return (
            <div
              key={message.id}
              className="mr-auto flex max-w-[85%] flex-col items-start"
            >
              <div className="rounded-xl rounded-tl-sm border border-warn/40 bg-warn/5 p-3">
                <p className="text-sm font-medium">
                  A few questions to clarify the board:
                </p>
                {message.questions.map((q, qi) => (
                  <p key={qi} className="mt-1 text-sm">
                    {qi + 1}. {q.question}
                    {q.options && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({q.options.join(", ")})
                      </span>
                    )}
                  </p>
                ))}
                {i === clarifyingIndex && !answering && (
                  <Button
                    size="sm"
                    className="mt-3"
                    data-testid="chat-clarify-answer"
                    onClick={startAnswering}
                  >
                    Answer
                  </Button>
                )}
              </div>

              {i === clarifyingIndex && answering && draftAnswers && (
                <div
                  className="mt-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
                  data-testid="chat-clarify-form"
                >
                  {message.questions.map((q, qi) => (
                    <div key={qi} className="space-y-1">
                      <label className="text-sm font-medium">
                        {q.question}
                      </label>
                      <input
                        data-testid="clarify-answer"
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        value={draftAnswers[qi] ?? ""}
                        onChange={(e) =>
                          setDraftAnswers((prev) =>
                            prev
                              ? prev.map((a, idx) =>
                                  idx === qi ? e.target.value : a
                                )
                              : prev
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    data-testid="chat-clarify-submit"
                    onClick={() => {
                      onClarifyAnswer(i, draftAnswers)
                      setDraftAnswers(null)
                    }}
                  >
                    Submit answers
                  </Button>
                </div>
              )}
              <span className="mt-1 text-[10px] text-muted-foreground">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )
        }
        if (message.kind === "error") {
          return (
            <div
              key={message.id}
              className="mr-auto max-w-[85%] self-start rounded-xl rounded-tl-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-sm text-destructive"
            >
              {message.content}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
