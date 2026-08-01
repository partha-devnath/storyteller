import type { ChatMessage } from "../types"

export function buildGenerateBoardPrompt({
  prompt,
  existingContext,
}: {
  prompt: string
  existingContext?: string
}): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that turns natural-language requirements into a living requirements board. " +
        "You MUST respond with JSON matching exactly this schema:\n" +
        '{"kind":"board","epics":[{"name":string,"description":string,"order":int,' +
        '"stories":[{"title":string,"description":string,"acceptanceCriteria":string[],' +
        '"priority":"low|medium|high|critical","suggestedStatus":"backlog|todo|in_progress|review|done"}]}]}\n' +
        "OR if the request is ambiguous, respond with:\n" +
        '{"kind":"clarifying","questions":[{"question":string,"options":[string]}]}\n' +
        "No markdown fences, no prose — only the JSON object.",
    },
    {
      role: "user",
      content: existingContext
        ? `Existing board context:\n${existingContext}\n\nPrompt:\n${prompt}`
        : prompt,
    },
  ]
}
