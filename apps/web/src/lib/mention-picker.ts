import { useState } from "react"

export function useMentionPicker() {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  function handleInput(value: string, caret: number) {
    const before = value.slice(0, caret)
    const at = before.lastIndexOf("@")
    if (
      at >= 0 &&
      before.slice(at + 1).match(/^[\w\s-]*$/) &&
      !/\s/.test(before.slice(at + 1))
    ) {
      setMentionQuery(before.slice(at + 1))
    } else {
      setMentionQuery(null)
    }
  }

  function stopMention() {
    setMentionQuery(null)
  }

  return { mentionQuery, handleInput, stopMention }
}
