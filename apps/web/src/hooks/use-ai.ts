import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type AiResult =
  | {
      kind: "clarifying"
      questions: { question: string; options?: string[] }[]
    }
  | {
      kind: "board"
      proposal: { proposalId: string; changeCount: number }
      summary: {
        created: number
        updated: number
        skipped: { title: string; reason: string }[]
      }
      summaryText: string
    }

export function useAiGenerate(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { prompt: string }) => {
      const res = await apiClient<Envelope<AiResult>>(
        `/api/ai/generate?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: { projectSlug, prompt: input.prompt },
        }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["proposals", projectSlug] }),
  })
}

export function useAiProcess(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      instruction: string
      mentions?: { type: "card" | "member"; id: string; label: string }[]
    }) => {
      const res = await apiClient<
        Envelope<{ proposal: { proposalId: string; changeCount: number } }>
      >(`/api/ai/process?project=${encodeURIComponent(projectSlug)}`, {
        method: "POST",
        body: {
          projectSlug,
          instruction: input.instruction,
          mentions: input.mentions ?? [],
        },
      })
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["proposals", projectSlug] }),
  })
}

export function useAiClarify(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      question: string
      answer: string
      priorAnswers: string
      prompt: string
    }) => {
      const res = await apiClient<Envelope<AiResult>>(
        `/api/ai/clarify?project=${encodeURIComponent(projectSlug)}`,
        {
          method: "POST",
          body: { projectSlug, ...input },
        }
      )
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["proposals", projectSlug] }),
  })
}
