import { FileText, User } from "lucide-react"

export type MentionOption = {
  type: "card" | "member"
  id: string
  label: string
}

export function MentionMenu({
  query,
  options,
  onSelect,
  onClose,
}: {
  query: string
  options: MentionOption[]
  onSelect: (option: MentionOption) => void
  onClose: () => void
}) {
  const q = query.trim().toLowerCase()
  const matches = (o: MentionOption) =>
    !q || o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)

  const cards = options.filter((o) => o.type === "card" && matches(o))
  const members = options.filter((o) => o.type === "member" && matches(o))

  const total = cards.length + members.length
  if (total === 0) return null

  function row(option: MentionOption) {
    return (
      <button
        key={`${option.type}-${option.id}`}
        type="button"
        data-testid={`chat-mention-${option.type}-${option.id}`}
        onClick={() => {
          onSelect(option)
          onClose()
        }}
        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted"
      >
        {option.type === "card" ? (
          <FileText className="size-4 shrink-0 text-primary" />
        ) : (
          <User className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{option.label}</span>
      </button>
    )
  }

  return (
    <div
      data-testid="chat-mention-menu"
      className="max-h-72 overflow-y-auto rounded-xl border border-input bg-card p-1.5 shadow-lg [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
    >
      {cards.length > 0 && (
        <div className="mb-1">
          <p className="px-3 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            Cards
          </p>
          <div className="flex flex-col">{cards.map(row)}</div>
        </div>
      )}
      {members.length > 0 && (
        <div>
          <p className="px-3 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
            Members
          </p>
          <div className="flex flex-col">{members.map(row)}</div>
        </div>
      )}
    </div>
  )
}
