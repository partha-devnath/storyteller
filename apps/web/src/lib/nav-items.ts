import { ChartNoAxesColumn, CreditCard, LayoutGrid, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type WorkspaceNavItem = {
  label: "Boards"
  to: string
  icon: LucideIcon
}

export type OrgNavItem = {
  label: "Members" | "Billing" | "Analytics"
  to: string
  icon: LucideIcon
  testId?: string
}

export function getWorkspaceNavItems(): WorkspaceNavItem[] {
  return [{ label: "Boards", to: "/projects", icon: LayoutGrid }]
}

export function getOrgNavItems(orgId: string | undefined): OrgNavItem[] {
  if (!orgId) return []
  return [
    { label: "Members", to: `/orgs/${orgId}/members`, icon: Users },
    {
      label: "Billing",
      to: `/orgs/${orgId}/billing`,
      icon: CreditCard,
      testId: "nav-billing",
    },
    {
      label: "Analytics",
      to: `/orgs/${orgId}/analytics`,
      icon: ChartNoAxesColumn,
      testId: "nav-analytics",
    },
  ]
}
