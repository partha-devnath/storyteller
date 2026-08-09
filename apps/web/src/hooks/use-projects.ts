import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type ProjectSummary = {
  id: string
  name: string
  slug: string
  description: string | null
  columns: { key: string; title: string }[]
  createdAt: string
  updatedAt: string
  cardCount: number
  frozenCount: number
  pendingProposals: number
  lastActivity: string | null
}

export type CardSectionInput = {
  key: string
  label: string
  description: string
  builtIn: boolean
}

export type ProjectDetail = {
  project: {
    id: string
    name: string
    slug: string
    description: string | null
    orgId: string
    columns: { key: string; title: string }[]
    cardSections?: CardSectionInput[]
  }
  epics: { id: string; name: string; order: number }[]
  cards: {
    id: string
    title: string
    slug: string
    status: string
    priority: string
    isClosed: boolean
    assigneeId: string | null
    epicId: string | null
    acceptanceCriteriaCount: number
    updatedAt: string
  }[]
}

export function useProjects(orgId: string) {
  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProjectSummary[]>>(
        `/api/projects?orgId=${encodeURIComponent(orgId)}`
      )
      return res.data
    },
    enabled: Boolean(orgId),
  })
}

export function useProject(slug: string | undefined) {
  return useQuery({
    queryKey: ["project", slug],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProjectDetail>>(
        `/api/projects/${slug}`
      )
      return res.data
    },
    enabled: Boolean(slug),
  })
}

export type ProposedCard = {
  id: string
  keyNo: number
  title: string
  slug: string
  status: string
  priority: "low" | "medium" | "high" | "critical"
  isClosed: boolean
  assigneeId: string | null
  epicId: string | null
  acceptanceCriteriaCount: number
  proposalId: string
  changeId: string
  updatedAt: string
}

export function useProposedCards(slug: string | undefined) {
  return useQuery({
    queryKey: ["project", slug, "proposed"],
    queryFn: async () => {
      const res = await apiClient<Envelope<ProposedCard[]>>(
        `/api/projects/${slug}/proposed`
      )
      return res.data
    },
    enabled: Boolean(slug),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      orgId: string
      name: string
      slug?: string
      description?: string
    }) => {
      const res = await apiClient<
        Envelope<{ id: string; name: string; slug: string }>
      >("/api/projects", { method: "POST", body: input })
      return res.data
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["projects", vars.orgId] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await apiClient<Envelope<{ deleted: string }>>(
        `/api/projects/${slug}`,
        { method: "DELETE" }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      qc.invalidateQueries({ queryKey: ["project"] })
    },
  })
}

export function useUpdateProject(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cardSections: CardSectionInput[]) => {
      const res = await apiClient<
        Envelope<{ project: { cardSections: CardSectionInput[] } }>
      >(`/api/projects/${slug}`, { method: "PATCH", body: { cardSections } })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}
