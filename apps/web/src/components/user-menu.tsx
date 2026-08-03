import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@workspace/ui/components/button"
import { ChevronsUpDown } from "lucide-react"

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
        render={<Button variant="outline" size="sm" className="gap-2" />}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{name}</span>
        <ChevronsUpDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
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
