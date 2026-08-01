import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

type Envelope<T> = { success: boolean; data: T }

export type AiResult =
  | {
      kind: "clarifying"
      questions: { question: string; options?: string[] }[]
    }
  | { kind: "board"; proposal: { proposalId: string; changeCount: number } }

export function useAiGenerate(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { prompt: string }) => {
      const res = await apiClient<Envelope<AiResult>>("/api/ai/generate", {
        method: "POST",
        body: { projectSlug, prompt: input.prompt },
      })
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["proposals", projectSlug] }),
  })
}

export function useAiProcess(projectSlug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { instruction: string }) => {
      const res = await apiClient<
        Envelope<{ proposal: { proposalId: string; changeCount: number } }>
      >("/api/ai/process", {
        method: "POST",
        body: { projectSlug, instruction: input.instruction },
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
      const res = await apiClient<Envelope<AiResult>>("/api/ai/clarify", {
        method: "POST",
        body: { projectSlug, ...input },
      })
      return res.data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["proposals", projectSlug] }),
  })
}
