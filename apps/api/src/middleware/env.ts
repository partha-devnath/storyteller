export type OrgRole = "owner" | "admin" | "member" | "viewer"

export type AppEnv = {
  Variables: {
    requestId: string
    orgId: string
    role: OrgRole
    userId: string
    projectId?: string
    body?: unknown
  }
}
