import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export type GraphNode = {
  id: string
  keyNo: number
  kind: "epic" | "card"
  title: string
  subtitle: string | null
  isClosed: boolean
  isProposed: boolean
  priority: "low" | "medium" | "high" | "critical" | null
  epicId: string | null
  childCount: number
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  type: "dependency" | "hierarchy" | "evolution"
}

type Envelope<T> = { success: boolean; data: T }

export function useGraph(projectSlug: string | undefined, proposalId?: string) {
  return useQuery({
    queryKey: ["project", projectSlug, "graph", proposalId ?? "base"],
    queryFn: async () => {
      const q = proposalId ? `?proposal=${encodeURIComponent(proposalId)}` : ""
      const res = await apiClient<
        Envelope<{ nodes: GraphNode[]; edges: GraphEdge[] }>
      >(`/api/projects/${projectSlug}/graph${q}`)
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}
