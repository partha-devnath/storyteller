import { Button } from "@workspace/ui/components/button"

const roleBadgeClasses: Record<string, string> = {
  owner: "bg-primary/10 text-primary",
  admin: "bg-secondary text-secondary-foreground",
  member: "bg-muted text-muted-foreground",
  viewer: "bg-muted/50 text-muted-foreground",
}

export function UserMenu({
  name,
  role,
  onLogout,
}: {
  name: string
  role?: "owner" | "admin" | "member" | "viewer"
  onLogout: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      {role && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClasses[role] ?? roleBadgeClasses.member}`}
        >
          {role}
        </span>
      )}
      <span className="text-sm">{name}</span>
      <Button variant="outline" size="sm" onClick={onLogout}>
        Sign out
      </Button>
    </div>
  )
}
