import { useNavigate } from "react-router"
import { useOrgs } from "@/hooks/use-orgs"
import { useBoardStore } from "@/stores/board-store"
import { cn } from "@workspace/ui/lib/utils"

export function OrgSwitcher() {
  const { data: orgs, isLoading } = useOrgs()
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const setSelectedOrgId = useBoardStore((s) => s.setSelectedOrgId)
  const navigate = useNavigate()

  if (isLoading) {
    return <p className="px-3 text-xs text-muted-foreground">Loading orgs...</p>
  }
  if (!orgs || orgs.length === 0) {
    return <p className="px-3 text-xs text-muted-foreground">No orgs yet.</p>
  }

  return (
    <div className="space-y-1">
      <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Organizations
      </p>
      {orgs.map((org) => (
        <button
          key={org.id}
          onClick={() => {
            setSelectedOrgId(org.id)
            navigate("/projects")
          }}
          className={cn(
            "block w-full rounded-md px-3 py-2 text-left text-sm",
            org.id === selectedOrgId
              ? "bg-muted font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {org.name}
          <span className="ml-2 text-xs opacity-60">({org.role})</span>
        </button>
      ))}
    </div>
  )
}
