import { useRef } from "react"
import { FileText, User } from "lucide-react"

export type MentionOption = {
  type: "card" | "member"
  id: string
  label: string
}

export function MentionMenu({
  query,
  pos,
  options,
  onSelect,
  onClose,
}: {
  query: string
  pos: { top: number; left: number } | null
  options: MentionOption[]
  onSelect: (option: MentionOption) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
      )
    : options

  if (filtered.length === 0) return null

  return (
    <div
      ref={ref}
      data-testid="chat-mention-menu"
      className="absolute z-50 w-60 rounded-lg border border-input bg-popover p-1 shadow-lg"
      style={pos ? { top: pos.top, left: pos.left } : undefined}
    >
      <p className="px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
        Mention
      </p>
      <div className="flex flex-col">
        {filtered.map((o) => (
          <button
            key={`${o.type}-${o.id}`}
            type="button"
            data-testid={`chat-mention-${o.type}-${o.id}`}
            onClick={() => {
              onSelect(o)
              onClose()
            }}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            {o.type === "card" ? (
              <FileText className="size-3.5 shrink-0 text-primary" />
            ) : (
              <User className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{o.label}</span>
            <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground uppercase">
              {o.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
