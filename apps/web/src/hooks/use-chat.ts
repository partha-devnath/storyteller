import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type MentionItem = {
  type: "card" | "member"
  id: string
  label: string
}

export type ChatMessageRow = {
  id: string
  projectId: string
  sessionId: string | null
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content: string
  questions: { question: string; options?: string[] }[] | null
  proposalId: string | null
  mentions: MentionItem[] | null
  createdAt: string
  updatedAt: string
}

export type ChatMessageInput = {
  role: "user" | "ai"
  kind: "prompt" | "board" | "clarifying" | "error"
  content?: string
  questions?: { question: string; options?: string[] }[] | null
  proposalId?: string | null
  sessionId?: string | null
  mentions?: MentionItem[] | null
}

export function useChatMessages(
  projectSlug: string | undefined,
  sessionId?: string | null
) {
  return useQuery({
    queryKey: ["chat", projectSlug, "messages", sessionId ?? "default"],
    queryFn: async () => {
      const q = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ""
      const res = await apiClient<Envelope<ChatMessageRow[]>>(
        `/api/chat?project=${encodeURIComponent(projectSlug ?? "")}${q}`
      )
      return res.data
    },
    enabled: Boolean(projectSlug),
  })
}

export function useAddChatMessage(
  projectSlug: string,
  sessionId?: string | null
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: ChatMessageInput) => {
      const res = await apiClient<Envelope<ChatMessageRow>>(
        `/api/chat?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: { ...input, sessionId: sessionId ?? input.sessionId ?? null },
        }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", projectSlug, "messages"] })
      qc.invalidateQueries({ queryKey: ["chat", projectSlug, "sessions"] })
    },
  })
}
