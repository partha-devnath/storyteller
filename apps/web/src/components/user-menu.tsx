import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Settings } from "lucide-react"

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
  const initial = name.trim().charAt(0).toUpperCase() || "U"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-input bg-muted font-mono text-[11px] font-semibold text-primary">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">
                {name}
              </span>
              <span className="block text-[11px] text-muted-foreground capitalize">
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member"}
              </span>
            </span>
            <Settings className="size-4 shrink-0 text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent align="start" side="right" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{name}</span>
              {role && (
                <span
                  className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClasses[role] ?? roleBadgeClasses.member}`}
                >
                  {role}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
