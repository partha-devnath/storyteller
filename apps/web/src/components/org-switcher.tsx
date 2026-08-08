import { useState } from "react"
import { useNavigate } from "react-router"
import { useOrgs } from "@/hooks/use-orgs"
import { useBoardStore } from "@/stores/board-store"
import { cn } from "@workspace/ui/lib/utils"
import { Check, ChevronDown, Plus } from "lucide-react"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function OrgSwitcher() {
  const { data: orgs, isLoading } = useOrgs()
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const setSelectedOrgId = useBoardStore((s) => s.setSelectedOrgId)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">Loading orgs...</p>
    )
  }
  if (!orgs || orgs.length === 0) {
    return (
      <button
        onClick={() => navigate("/onboarding")}
        className="mx-1 mb-3 flex w-[calc(100%-8px)] items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-2 text-left text-[13px] hover:border-primary"
      >
        <span className="grid size-6 place-items-center rounded-md bg-muted font-mono text-[10px] font-semibold text-primary">
          +
        </span>
        <span className="truncate font-semibold">Create organization</span>
      </button>
    )
  }

  const active = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0]

  return (
    <div className="relative px-1 pb-4">
      <button
        data-testid="org-switcher"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-input bg-background px-2.5 py-2 text-left text-[13px] transition-colors hover:border-primary",
          open && "border-primary"
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-[10px] font-semibold text-primary">
          {initials(active.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{active.name}</span>
          <span className="block text-[11px] text-muted-foreground capitalize">
            {active.role}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 rounded-xl border border-input bg-popover p-1.5 shadow-lg"
            data-testid="org-switcher-menu"
          >
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setSelectedOrgId(org.id)
                  setOpen(false)
                  navigate("/projects")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-foreground/80 hover:bg-background hover:text-foreground",
                  org.id === active.id &&
                    "bg-background font-semibold text-foreground"
                )}
              >
                <span className="grid size-5.5 shrink-0 place-items-center rounded-md bg-background font-mono text-[10px] text-muted-foreground">
                  {initials(org.name)}
                </span>
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.id === active.id && (
                  <Check className="size-3.5 shrink-0 text-primary" />
                )}
              </button>
            ))}
            <button
              onClick={() => navigate("/onboarding")}
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2 py-2 text-[13px] font-semibold text-primary"
            >
              <Plus className="size-4" />
              Create organization
            </button>
          </div>
        </>
      )}
    </div>
  )
}
