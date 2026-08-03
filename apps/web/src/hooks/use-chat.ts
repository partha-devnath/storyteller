import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type ChatMessageRow = {
  id: string
  projectId: string
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content: string
  questions: { question: string; options?: string[] }[] | null
  proposalId: string | null
  createdAt: string
  updatedAt: string
}

export type ChatMessageInput = {
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content?: string
  questions?: { question: string; options?: string[] }[] | null
  proposalId?: string | null
}

export function useChatMessages(projectSlug: string | undefined) {
  return useQuery({
    queryKey: ["chat", projectSlug],
    queryFn: async () => {
      const res = await apiClient<Envelope<ChatMessageRow[]>>(
        `/api/chat?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}

export function useAddChatMessage(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChatMessageInput) => {
      const res = await apiClient<Envelope<ChatMessageRow>>(
        `/api/chat?project=${encodeURIComponent(projectSlug)}`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", projectSlug] }),
  })
}
