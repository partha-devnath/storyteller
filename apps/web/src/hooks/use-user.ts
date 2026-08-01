import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type ProtectedResponse = {
  success: boolean
  data: { user: { id: string; name: string; email: string } }
}

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: () => apiClient<ProtectedResponse>("/api/protected"),
    retry: false,
  })
}
