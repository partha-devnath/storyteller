import { Popover, PopoverContent } from "@workspace/ui/components/popover"

export type MentionMember = { id: string; name: string }

export function MentionPicker({
  open,
  anchorRect,
  query,
  members,
  onSelect,
}: {
  open: boolean
  anchorRect: { top: number; left: number } | null
  query: string
  members: MentionMember[]
  onSelect: (member: MentionMember) => void
}) {
  const q = query.trim().toLowerCase()
  const filtered = q
    ? members.filter((m) => m.name.toLowerCase().includes(q))
    : members

  return (
    <Popover open={open} onOpenChange={() => {}}>
      <PopoverContent
        data-testid="mention-picker"
        align="start"
        sideOffset={4}
        className="w-56 p-1"
        style={
          anchorRect
            ? {
                position: "fixed",
                top: anchorRect.top,
                left: anchorRect.left,
              }
            : undefined
        }
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No members found
          </p>
        ) : (
          <div className="flex flex-col">
            {filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                data-testid={`mention-option-${member.id}`}
                onClick={() => onSelect(member)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <span>{member.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
