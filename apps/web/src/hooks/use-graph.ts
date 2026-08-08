import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export type GraphNode = {
  id: string
  keyNo: number
  kind: "epic" | "card"
  title: string
  subtitle: string | null
  isClosed: boolean
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

export function useGraph(projectSlug: string | undefined) {
  return useQuery({
    queryKey: ["project", projectSlug, "graph"],
    queryFn: async () => {
      const res = await apiClient<
        Envelope<{ nodes: GraphNode[]; edges: GraphEdge[] }>
      >(`/api/projects/${projectSlug}/graph`)
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}
