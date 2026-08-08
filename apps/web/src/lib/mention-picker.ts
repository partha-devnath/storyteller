import { useState } from "react"

export function useMentionPicker() {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionPos, setMentionPos] = useState<{
    top: number
    left: number
  } | null>(null)

  function handleInput(
    value: string,
    caret: number,
    inputRect: DOMRect | null
  ) {
    const before = value.slice(0, caret)
    const at = before.lastIndexOf("@")
    if (
      at >= 0 &&
      before.slice(at + 1).match(/^[\w\s-]*$/) &&
      !/\s/.test(before.slice(at + 1))
    ) {
      setMentionQuery(before.slice(at + 1))
      if (inputRect) {
        const text = before.slice(at + 1)
        setMentionPos({
          top: inputRect.top - 8,
          left: inputRect.left + 14 + text.length * 8,
        })
      }
    } else {
      setMentionQuery(null)
      setMentionPos(null)
    }
  }

  function stopMention() {
    setMentionQuery(null)
    setMentionPos(null)
  }

  return { mentionQuery, mentionPos, handleInput, stopMention }
}
