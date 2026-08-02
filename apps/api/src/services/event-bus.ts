import { createLogger } from "@workspace/logger"

const logger = createLogger("api")

export type ProjectEvent =
  | {
      type: "comment.created"
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
    }
  | {
      type: "card.created"
      card: { id: string; title: string; slug: string; status: string }
    }
  | {
      type: "card.updated"
      card: {
        id: string
        title: string
        slug: string
        status: string
        isClosed: boolean
      }
    }
  | { type: "proposal.ready"; proposalId: string }

type Handler = (event: ProjectEvent) => void

const subscribers = new Map<string, Set<Handler>>()

export function publish(projectId: string, event: ProjectEvent): void {
  const handlers = subscribers.get(projectId)
  if (!handlers || handlers.size === 0) return
  for (const handler of handlers) {
    try {
      handler(event)
    } catch (error) {
      logger.error(
        { projectId, eventType: event.type, error },
        "event-bus: subscriber handler failed"
      )
    }
  }
}

export function subscribe(projectId: string, handler: Handler): () => void {
  let handlers = subscribers.get(projectId)
  if (!handlers) {
    handlers = new Set()
    subscribers.set(projectId, handlers)
  }
  handlers.add(handler)
  return () => {
    handlers!.delete(handler)
    if (handlers!.size === 0) subscribers.delete(projectId)
  }
}
