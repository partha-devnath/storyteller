import { useQuery } from "@tanstack/react-query"
import { type AnalyticsState } from "@workspace/schemas"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export function useAnalytics(orgId: string | undefined) {
  return useQuery({
    queryKey: ["analytics", orgId],
    queryFn: async () => {
      const res = await apiClient<Envelope<AnalyticsState>>(
        `/api/orgs/${orgId}/analytics?range=30d`
      )
      return res.data
    },
    enabled: Boolean(orgId),
  })
}
