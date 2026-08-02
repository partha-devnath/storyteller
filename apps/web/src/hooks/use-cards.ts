import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type BoardCard = {
  id: string
  title: string
  slug: string
  status: string
  priority: "low" | "medium" | "high" | "critical"
  isClosed: boolean
  assigneeId: string | null
  epicId: string | null
  acceptanceCriteriaCount: number
  updatedAt: string
}

export type CardDetail = {
  card: {
    id: string
    title: string
    slug: string
    description: string | null
    acceptanceCriteria: string[]
    status: string
    priority: string
    isClosed: boolean
    assigneeId: string | null
    customFields: Record<string, string> | null
    closedAt: string | null
  }
  latestVersion: {
    versionNo: number
    changeType: string
    title: string
    description: string | null
  } | null
  relations: {
    id: string
    type: string
    sourceCardId: string
    targetCardId: string
  }[]
  comments: {
    id: string
    body: string
    parentId: string | null
    userId: string
    userName: string
    createdAt: string
  }[]
  attachments: {
    id: string
    fileId: string
    url: string
    originalName: string
  }[]
}

export type CommentItem = {
  id: string
  body: string
  parentId: string | null
  mentions: string[]
  userId: string
  userName: string
  createdAt: string
}

export type CardVersion = {
  id: string
  versionNo: number
  changeType: string
  title: string
  description: string | null
  acceptanceCriteria: string[]
  status: string
  priority: string
  createdBy: string
  createdAt: string
}

export type SimilarCard = {
  cardId: string
  title: string
  slug: string
  isClosed: boolean
  similarity: number
}

export function useCards(projectSlug: string | undefined) {
  return useQuery({
    queryKey: ["project", projectSlug, "cards"],
    queryFn: async () => {
      const res = await apiClient<Envelope<{ cards: BoardCard[] }>>(
        `/api/projects/${projectSlug}`
      )
      return res.data.cards
    },
    enabled: Boolean(projectSlug),
  })
}

export function useCardDetail(
  cardId: string | undefined,
  projectSlug?: string
) {
  return useQuery({
    queryKey: ["card", cardId],
    queryFn: async () => {
      const res = await apiClient<Envelope<CardDetail>>(
        `/api/cards/${cardId}?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(cardId),
  })
}

export function useCardVersions(
  cardId: string | undefined,
  projectSlug?: string
) {
  return useQuery({
    queryKey: ["card", cardId, "versions"],
    queryFn: async () => {
      const res = await apiClient<Envelope<CardVersion[]>>(
        `/api/cards/${cardId}/versions?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(cardId),
  })
}

export function useCardComments(
  cardId: string | undefined,
  projectSlug?: string
) {
  return useQuery({
    queryKey: ["card", cardId, "comments"],
    queryFn: async () => {
      const res = await apiClient<Envelope<CommentItem[]>>(
        `/api/cards/${cardId}/comments?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(cardId),
  })
}

export function useCardSimilar(
  cardId: string | undefined,
  projectSlug?: string
) {
  return useQuery({
    queryKey: ["card", cardId, "similar"],
    queryFn: async () => {
      const res = await apiClient<Envelope<SimilarCard[]>>(
        `/api/cards/${cardId}/similar?project=${encodeURIComponent(projectSlug ?? "")}`
      )
      return res.data
    },
    enabled: Boolean(cardId),
  })
}

export function useCreateCard(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      title: string
      description?: string
      status: string
      priority: string
      acceptanceCriteria?: string[]
    }) => {
      const res = await apiClient<Envelope<{ id: string; slug: string }>>(
        `/api/cards?project=${encodeURIComponent(projectSlug)}`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project"] }),
  })
}

export function useMoveCard(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { cardId: string; status: string }) => {
      const res = await apiClient<Envelope<{ id: string }>>(
        `/api/cards/${input.cardId}?project=${encodeURIComponent(projectSlug)}`,
        { method: "PATCH", body: { status: input.status } }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project"] }),
  })
}

export function useCloseCard(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { cardId: string; reason?: string }) => {
      const res = await apiClient<Envelope<{ id: string; closed: boolean }>>(
        `/api/cards/${input.cardId}/close?project=${encodeURIComponent(projectSlug)}`,
        { method: "POST", body: { reason: input.reason } }
      )
      return res.data
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: ["card", input.cardId] })
    },
  })
}

export function useAddComment(
  cardId: string | undefined,
  projectSlug?: string
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      body: string
      parentId?: string
      mentions?: string[]
    }) => {
      const res = await apiClient<Envelope<{ id: string }>>(
        `/api/cards/${cardId}/comments?project=${encodeURIComponent(projectSlug ?? "")}`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["card", cardId, "comments"] }),
  })
}
