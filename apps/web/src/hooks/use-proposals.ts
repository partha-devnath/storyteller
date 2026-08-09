import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type ProposalSummary = {
  id: string
  instruction: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  changeCount: number
}

export type ProposalChangeRow = {
  id: string
  changeType: "create" | "update" | "close"
  targetCardId: string | null
  newData: Record<string, unknown>
  before: {
    id: string
    title: string
    description: string | null
    acceptanceCriteria: string[]
    status: string
    priority: string
  } | null
  relationSummary: {
    type: "dependency" | "hierarchy" | "evolution"
    sourceCardId?: string
    targetCardId?: string
    note: string
  }[]
  conflictFlags: {
    type: "contradiction" | "duplicate" | "conflict"
    summary: string
  }[]
}

export type ProposalDetail = {
  proposal: {
    id: string
    instruction: string
    status: "pending" | "approved" | "rejected"
    createdAt: string
  }
  changes: ProposalChangeRow[]
}

export function useProposals(projectSlug: string | undefined) {
  return useQuery({
    queryKey: ["proposals", projectSlug],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProposalSummary[]>>(
        `/api/proposals?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}

export function useProposal(id: string | undefined, projectSlug?: string) {
  return useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProposalDetail>>(
        `/api/proposals/${id}?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useApproveProposal(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { proposalId: string; changeId?: string }) => {
      const res = await apiClient<Envelope<{ applied: number }>>(
        `/api/proposals/${input.proposalId}/approve?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: input.changeId ? { changeId: input.changeId } : undefined,
        }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal"] })
      qc.invalidateQueries({ queryKey: ["proposals"] })
      qc.invalidateQueries({ queryKey: ["project", projectSlug, "proposed"] })
    },
  })
}

export function useRejectProposal(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      proposalId: string
      changeId?: string
      reason?: string
    }) => {
      const res = await apiClient<Envelope<{ rejected: string }>>(
        `/api/proposals/${input.proposalId}/reject?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: {
            ...(input.changeId ? { changeId: input.changeId } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
          },
        }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposal"] })
      qc.invalidateQueries({ queryKey: ["proposals"] })
      qc.invalidateQueries({ queryKey: ["project", projectSlug, "proposed"] })
    },
  })
}
