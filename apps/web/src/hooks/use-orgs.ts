import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type OrgWithRole = {
  id: string
  name: string
  slug: string
  role: "owner" | "admin" | "member" | "viewer"
  createdAt: string
}

export type OrgMember = {
  id: string
  userId: string
  email: string
  name: string
  role: "owner" | "admin" | "member" | "viewer"
  inviteStatus: string | null
}

export function useOrgs() {
  return useQuery({
    queryKey: ["orgs"],
    queryFn: async () => {
      const res = await apiClient<Envelope<OrgWithRole[]>>("/api/orgs")
      return res.data
    },
  })
}

export function useCreateOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; slug?: string }) => {
      const res = await apiClient<Envelope<{ org: OrgWithRole; role: string }>>(
        "/api/orgs",
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orgs"] }),
  })
}

export function useInviteMember(orgId: string) {
  return useMutation({
    mutationFn: async (input: {
      email: string
      role: "owner" | "admin" | "member" | "viewer"
    }) => {
      const res = await apiClient<Envelope<{ inviteId: string }>>(
        `/api/orgs/${orgId}/invite`,
        { method: "POST", body: input }
      )
      return res.data
    },
  })
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (input: { token: string }) => {
      const res = await apiClient<Envelope<{ orgId: string; role: string }>>(
        "/api/orgs/invites/accept",
        { method: "POST", body: input }
      )
      return res.data
    },
  })
}

export function useOrgMembers(orgId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["orgs", orgId, "members"],
    queryFn: async () => {
      const res = await apiClient<Envelope<OrgMember[]>>(
        `/api/orgs/${orgId}/members`
      )
      return res.data
    },
    enabled: options?.enabled ?? Boolean(orgId),
  })
}

export function useChangeMemberRole(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      role: "owner" | "admin" | "member" | "viewer"
    }) => {
      const res = await apiClient<Envelope<{ userId: string; role: string }>>(
        `/api/orgs/${orgId}/members/${input.userId}`,
        { method: "PATCH", body: { role: input.role } }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "members"] }),
  })
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient<Envelope<{ removed: string }>>(
        `/api/orgs/${orgId}/members/${userId}`,
        { method: "DELETE" }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["orgs", orgId, "members"] }),
  })
}
