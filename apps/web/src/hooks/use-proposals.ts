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

export function useProposals(projectId: string | undefined) {
  return useQuery({
    queryKey: ["proposals", projectId],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProposalSummary[]>>(
        `/api/proposals?project=${encodeURIComponent(projectId ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(projectId),
  })
}

export function useProposal(id: string | undefined) {
  return useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProposalDetail>>(
        `/api/proposals/${id}?project=`
      )
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useApproveProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient<Envelope<{ applied: number }>>(
        `/api/proposals/${id}/approve`,
        { method: "POST" }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  })
}

export function useRejectProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; reason?: string }) => {
      const res = await apiClient<Envelope<{ rejected: string }>>(
        `/api/proposals/${input.id}/reject`,
        { method: "POST", body: { reason: input.reason } }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  })
}
