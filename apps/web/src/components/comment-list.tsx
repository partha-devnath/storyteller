import { parseMentionSegments } from "@/lib/mention-segments"
import type { CommentItem } from "@/hooks/use-cards"

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return "just now"
  const minutes = Math.floor(diffSec / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

export function CommentList({
  comments,
  memberNameById,
  onReply,
}: {
  comments: CommentItem[]
  memberNameById: Record<string, string>
  onReply: (comment: CommentItem) => void
}) {
  if (comments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No comments yet — start the discussion.
      </p>
    )
  }

  const childrenByParent = new Map<string, CommentItem[]>()
  for (const comment of comments) {
    if (!comment.parentId) continue
    const siblings = childrenByParent.get(comment.parentId) ?? []
    siblings.push(comment)
    childrenByParent.set(comment.parentId, siblings)
  }
  const roots = comments
    .filter((comment) => !comment.parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  function renderComment(comment: CommentItem, depth: number) {
    const children = (childrenByParent.get(comment.id) ?? []).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    )
    const segments = parseMentionSegments(
      comment.body,
      comment.mentions,
      memberNameById
    )
    return (
      <div key={comment.id}>
        <div
          data-testid="comment-item"
          data-comment-id={comment.id}
          className={`space-y-1 ${depth > 0 ? "ml-6" : ""}`}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
              {comment.userName.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-semibold">{comment.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelative(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm">
            {segments.map((segment, index) =>
              segment.type === "mention" ? (
                <span
                  key={index}
                  data-testid="comment-mention"
                  className="rounded bg-primary/10 px-1 text-primary"
                >
                  {segment.value}
                </span>
              ) : (
                <span key={index}>{segment.value}</span>
              )
            )}
          </p>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onReply(comment)}
          >
            Reply
          </button>
        </div>
        {children.map((child) => renderComment(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {roots.map((comment) => renderComment(comment, 0))}
    </div>
  )
}
