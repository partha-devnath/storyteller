import { useState } from "react"

export function useMentionPicker() {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionCaret, setMentionCaret] = useState(0)
  const [mentionEnd, setMentionEnd] = useState(0)

  function handleInput(value: string, caret: number) {
    const before = value.slice(0, caret)
    const at = before.lastIndexOf("@")
    if (
      at >= 0 &&
      before.slice(at + 1).match(/^[\w\s-]*$/) &&
      !/\s/.test(before.slice(at + 1))
    ) {
      setMentionQuery(before.slice(at + 1))
      setMentionCaret(at)
      setMentionEnd(caret)
    } else {
      setMentionQuery(null)
    }
  }

  function stopMention() {
    setMentionQuery(null)
  }

  return { mentionQuery, mentionCaret, mentionEnd, handleInput, stopMention }
}
