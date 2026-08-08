import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type ChatSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export function useChatSessions(projectSlug: string | undefined) {
  return useQuery({
    queryKey: ["chat", projectSlug, "sessions"],
    queryFn: async () => {
      const res = await apiClient<Envelope<ChatSession[]>>(
        `/api/chat/sessions?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}

export function useCreateChatSession(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { title?: string }) => {
      const res = await apiClient<Envelope<ChatSession>>(
        `/api/chat/sessions?project=${encodeURIComponent(projectSlug)}`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["chat", projectSlug, "sessions"] }),
  })
}

export function useRenameChatSession(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const res = await apiClient<Envelope<ChatSession>>(
        `/api/chat/sessions/${input.id}?project=${encodeURIComponent(projectSlug)}`,
        { method: "PATCH", body: { title: input.title } }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["chat", projectSlug, "sessions"] }),
  })
}

export function useDeleteChatSession(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient<Envelope<{ deleted: string }>>(
        `/api/chat/sessions/${id}?project=${encodeURIComponent(projectSlug)}`,
        { method: "DELETE" }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["chat", projectSlug, "sessions"] }),
  })
}
