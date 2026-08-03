export type WorkspaceNavItem = {
  label: "Boards"
  to: string
}

export type OrgNavItem = {
  label: "Members" | "Billing" | "Analytics"
  to: string
  testId?: string
}

export function getWorkspaceNavItems(): WorkspaceNavItem[] {
  return [{ label: "Boards", to: "/projects" }]
}

export function getOrgNavItems(orgId: string | undefined): OrgNavItem[] {
  if (!orgId) return []
  return [
    { label: "Members", to: `/orgs/${orgId}/members` },
    { label: "Billing", to: `/orgs/${orgId}/billing`, testId: "nav-billing" },
    {
      label: "Analytics",
      to: `/orgs/${orgId}/analytics`,
      testId: "nav-analytics",
    },
  ]
}
