import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  useProposal,
  useApproveProposal,
  useRejectProposal,
} from "@/hooks/use-proposals"
import type { ChatMessageRow } from "@/hooks/use-chat"

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

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["proposals", projectSlug] })

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

  return (
    <div className="flex flex-col gap-3">
      {messages.map((message, i) => {
        if (message.kind === "prompt") {
          return (
            <div
              key={message.id}
              className="self-start rounded-lg bg-primary/10 px-3 py-2 text-sm"
            >
              {message.content}
            </div>
          )
        }
        if (message.kind === "board" && message.proposalId) {
          return (
            <div key={message.id} className="w-full self-start">
              {message.content && (
                <p className="mb-2 text-sm">{message.content}</p>
              )}
              <BoardReply
                proposalId={message.proposalId}
                projectSlug={projectSlug}
              />
            </div>
          )
        }
        if (message.kind === "clarifying" && message.questions) {
          return (
            <div key={message.id} className="w-full self-start">
              <div className="rounded-lg border p-3">
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
                {i === clarifyingIndex && (
                  <Button
                    size="sm"
                    className="mt-3"
                    data-testid="chat-clarify-answer"
                    onClick={() =>
                      onClarifyAnswer(
                        i,
                        message.questions!.map(() => "")
                      )
                    }
                  >
                    Answer
                  </Button>
                )}
              </div>
            </div>
          )
        }
        if (message.kind === "error") {
          return (
            <div
              key={message.id}
              className="self-start rounded-lg border px-3 py-2 text-sm text-destructive"
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
