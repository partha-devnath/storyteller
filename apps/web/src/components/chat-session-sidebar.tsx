import { useState } from "react"
import { Check, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react"
import type { ChatSession } from "@/hooks/use-chat-sessions"
import { cn } from "@workspace/ui/lib/utils"

export function ChatSessionSidebar({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  sessions: ChatSession[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  return (
    <div className="flex w-60 shrink-0 flex-col rounded-xl border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Sessions
        </p>
        <button
          data-testid="new-session"
          onClick={onCreate}
          aria-label="New session"
          className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 overflow-y-auto p-1.5">
        {sessions.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No sessions yet.
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            data-testid={`session-${s.id}`}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
              s.id === activeId
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {editingId === s.id ? (
              <form
                className="flex min-w-0 flex-1 items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (draft.trim()) onRename(s.id, draft.trim())
                  setEditingId(null)
                }}
              >
                <input
                  data-testid="session-rename-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoFocus
                  className="w-full min-w-0 rounded-md border border-input bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  aria-label="Save session name"
                  className="text-primary"
                >
                  <Check className="size-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => onSelect(s.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{s.title}</span>
              </button>
            )}
            <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
              <button
                aria-label="Rename session"
                onClick={() => {
                  setEditingId(s.id)
                  setDraft(s.title)
                }}
                className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Pencil className="size-3" />
              </button>
              <button
                aria-label="Delete session"
                onClick={() => onDelete(s.id)}
                className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-background hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
