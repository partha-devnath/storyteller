import { useEffect, useRef, useState } from "react"

export function useChatScroll(deps: unknown[]) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showJump, setShowJump] = useState(false)
  const nearBottomRef = useRef(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    nearBottomRef.current = distance < 80
    setShowJump(distance >= 80)
  }

  function jumpToBottom() {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    nearBottomRef.current = true
    setShowJump(false)
  }

  return { containerRef, showJump, handleScroll, jumpToBottom }
}
