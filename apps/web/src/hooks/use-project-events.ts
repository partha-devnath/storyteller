import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

export type LiveStatus = "connecting" | "open" | "closed"

export type ProjectEventHandlers = {
  onCommentCreated?: (payload: {
    cardId: string
    comment: {
      id: string
      body: string
      parentId: string | null
      mentions: string[]
      userId: string
      userName: string
      createdAt: string
    }
  }) => void
  onCardCreated?: () => void
  onCardUpdated?: () => void
  onProposalReady?: () => void
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export function useProjectEvents(
  projectSlug: string | undefined,
  handlers?: ProjectEventHandlers
): { status: LiveStatus; reconnect: () => void } {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>("connecting")
  const [nonce, setNonce] = useState(0)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!projectSlug) {
      return
    }

    let disposed = false
    const source = new EventSource(
      `${API_URL}/api/projects/${projectSlug}/events`,
      { withCredentials: true }
    )

    source.onopen = () => {
      if (!disposed) setStatus("open")
    }
    source.onerror = () => {
      // EventSource auto-reconnects; surface the closed state in the meantime.
      if (!disposed) setStatus("closed")
    }

    const handleCommentCreated = (event: MessageEvent<string>) => {
      let payload: Parameters<
        NonNullable<ProjectEventHandlers["onCommentCreated"]>
      >[0]
      try {
        payload = JSON.parse(event.data)
      } catch {
        return // ignore malformed payloads
      }
      handlersRef.current?.onCommentCreated?.(payload)
      queryClient.invalidateQueries({
        queryKey: ["card", payload.cardId, "comments"],
      })
    }

    const handleCardCreated = () => {
      handlersRef.current?.onCardCreated?.()
      queryClient.invalidateQueries({
        queryKey: ["project", projectSlug, "cards"],
      })
    }

    const handleCardUpdated = () => {
      handlersRef.current?.onCardUpdated?.()
      queryClient.invalidateQueries({
        queryKey: ["project", projectSlug, "cards"],
      })
    }

    const handleProposalReady = () => {
      handlersRef.current?.onProposalReady?.()
    }

    source.addEventListener("comment.created", handleCommentCreated)
    source.addEventListener("card.created", handleCardCreated)
    source.addEventListener("card.updated", handleCardUpdated)
    source.addEventListener("proposal.ready", handleProposalReady)

    return () => {
      disposed = true
      source.close()
    }
  }, [projectSlug, nonce, queryClient])

  return {
    status: projectSlug ? status : "closed",
    reconnect: () => {
      if (!projectSlug) return // noop when no project is selected
      setStatus("connecting")
      setNonce((n) => n + 1)
    },
  }
}
