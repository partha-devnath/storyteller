import { useMemo, useRef, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { useAddComment } from "@/hooks/use-cards"
import { useOrgMembers } from "@/hooks/use-orgs"
import { MentionPicker, type MentionMember } from "./mention-picker"

function measureCaret(textarea: HTMLTextAreaElement): {
  top: number
  left: number
} {
  try {
    const cs = window.getComputedStyle(textarea)
    const mirror = document.createElement("div")
    const caret = document.createElement("span")
    caret.textContent = textarea.value.slice(0, textarea.selectionStart ?? 0)
    mirror.appendChild(caret)
    mirror.style.cssText = [
      "position:absolute",
      "top:0",
      "left:-9999px",
      "visibility:hidden",
      "white-space:pre-wrap",
      "word-wrap:break-word",
      `width:${textarea.clientWidth}px`,
      `padding:${cs.padding}`,
      `border:${cs.border}`,
      `font:${cs.font}`,
      `line-height:${cs.lineHeight}`,
      `letter-spacing:${cs.letterSpacing}`,
    ].join(";")
    document.body.appendChild(mirror)
    const textareaRect = textarea.getBoundingClientRect()
    const mirrorRect = mirror.getBoundingClientRect()
    const caretRect = caret.getBoundingClientRect()
    document.body.removeChild(mirror)
    return {
      top:
        textareaRect.top +
        (caretRect.bottom - mirrorRect.top) -
        parseFloat(cs.borderTopWidth) +
        4,
      left:
        textareaRect.left +
        (caretRect.right - mirrorRect.left) -
        parseFloat(cs.borderLeftWidth),
    }
  } catch {
    const rect = textarea.getBoundingClientRect()
    return { top: rect.bottom, left: rect.left }
  }
}

export function CommentComposer({
  cardId,
  projectSlug,
  orgId,
  parentId,
  replyingToName,
  onCancelReply,
  onPosted,
}: {
  cardId: string
  projectSlug: string
  orgId: string
  parentId?: string | null
  replyingToName?: string | null
  onCancelReply?: () => void
  onPosted?: () => void
}) {
  const addComment = useAddComment(cardId, projectSlug)
  const { data: orgMembers } = useOrgMembers(orgId, {
    enabled: Boolean(orgId),
  })
  const [text, setText] = useState("")
  const [mentions, setMentions] = useState<Set<string>>(() => new Set())
  const [picker, setPicker] = useState<{
    open: boolean
    query: string
    anchor: { top: number; left: number } | null
  }>({ open: false, query: "", anchor: null })
  const [postError, setPostError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of orgMembers ?? []) map[m.userId] = m.name
    return map
  }, [orgMembers])

  const members = useMemo<MentionMember[]>(
    () => (orgMembers ?? []).map((m) => ({ id: m.userId, name: m.name })),
    [orgMembers]
  )

  if (!cardId) return null

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = event.target
    const value = el.value
    setText(value)

    // Drop mention ids whose "@Name" text was edited or deleted.
    setMentions((prev) => {
      const next = new Set(prev)
      for (const id of prev) {
        const name = memberNameById[id]
        if (name && !value.includes(`@${name}`)) next.delete(id)
      }
      return next
    })

    const caret = el.selectionStart ?? value.length
    const beforeCaret = value.slice(0, caret)
    const lastAt = beforeCaret.lastIndexOf("@")
    if (lastAt !== -1 && !/\s/.test(beforeCaret.slice(lastAt + 1))) {
      setPicker({
        open: true,
        query: beforeCaret.slice(lastAt + 1),
        anchor: measureCaret(el),
      })
    } else {
      setPicker({ open: false, query: "", anchor: null })
    }
  }

  function handleSelect(member: MentionMember) {
    const el = textareaRef.current
    const caret = el?.selectionStart ?? text.length
    const insertion = `@${member.name} `
    const next = text.slice(0, caret) + insertion + text.slice(caret)
    setText(next)
    setMentions((prev) => new Set(prev).add(member.id))
    setPicker({ open: false, query: "", anchor: null })
    requestAnimationFrame(() => {
      const node = textareaRef.current
      if (node) {
        node.focus()
        const pos = caret + insertion.length
        node.setSelectionRange(pos, pos)
      }
    })
  }

  async function handleSubmit() {
    const body = text.trim()
    if (!body || addComment.isPending) return
    setPostError(false)
    try {
      await addComment.mutateAsync({
        body,
        mentions: [...mentions],
        parentId: parentId ?? undefined,
      })
      setText("")
      setMentions(new Set())
      setPicker({ open: false, query: "", anchor: null })
      onPosted?.()
      onCancelReply?.()
    } catch {
      setPostError(true)
    }
  }

  return (
    <div className="space-y-2">
      {replyingToName && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Replying to {replyingToName}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onCancelReply?.()}
          >
            Cancel
          </Button>
        </div>
      )}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          rows={1}
          data-testid="comment-input"
          placeholder="Add a comment… (type @ to mention someone)"
          className="max-h-[100px]"
          value={text}
          onChange={handleChange}
        />
        <MentionPicker
          open={picker.open}
          anchorRect={picker.anchor}
          query={picker.query}
          members={members}
          onSelect={handleSelect}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          data-testid="comment-post"
          disabled={!text.trim() || addComment.isPending}
          onClick={handleSubmit}
        >
          {addComment.isPending ? "Posting…" : "Post"}
        </Button>
        {postError && (
          <p className="text-xs text-destructive">
            Couldn't post your comment. Try again.
          </p>
        )}
      </div>
    </div>
  )
}
