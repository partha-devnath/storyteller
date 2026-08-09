import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ProjectColumn } from "@/hooks/use-projects"

type Envelope<T> = { success: boolean; data: T }

export function useUpdateColumns(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (columns: ProjectColumn[]) => {
      const res = await apiClient<
        Envelope<{ project: { columns: ProjectColumn[] } }>
      >(`/api/projects/${slug}`, { method: "PATCH", body: { columns } })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}

export function useConnectColumn(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      columnKey: string
      provider: "github" | "trello"
      config: Record<string, string>
      target: string
      boardName?: string
      listName?: string
    }) => {
      const res = await apiClient<Envelope<{ key: string }>>(
        `/api/projects/${slug}/columns/${input.columnKey}/connect`,
        { method: "POST", body: input }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}

export function useDisconnectColumn(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (columnKey: string) => {
      const res = await apiClient<Envelope<{ key: string }>>(
        `/api/projects/${slug}/columns/${columnKey}/connect`,
        { method: "DELETE" }
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}

export function useTrelloBoards(
  slug: string | undefined,
  creds: { apiKey: string; token: string } | null
) {
  return useQuery({
    queryKey: ["integrations", slug, "trello", "boards", creds?.apiKey],
    queryFn: async () => {
      const res = await apiClient<Envelope<{ id: string; name: string }[]>>(
        `/api/projects/${slug}/integrations/trello/boards?apiKey=${encodeURIComponent(creds!.apiKey)}&token=${encodeURIComponent(creds!.token)}`
      )
      return res.data
    },
    enabled: Boolean(slug && creds),
  })
}

export function useTrelloLists(
  slug: string | undefined,
  creds: { apiKey: string; token: string } | null,
  boardId: string | null
) {
  return useQuery({
    queryKey: ["integrations", slug, "trello", "lists", boardId, creds?.apiKey],
    queryFn: async () => {
      const res = await apiClient<Envelope<{ id: string; name: string }[]>>(
        `/api/projects/${slug}/integrations/trello/lists?apiKey=${encodeURIComponent(creds!.apiKey)}&token=${encodeURIComponent(creds!.token)}&board=${encodeURIComponent(boardId!)}`
      )
      return res.data
    },
    enabled: Boolean(slug && creds && boardId),
  })
}
