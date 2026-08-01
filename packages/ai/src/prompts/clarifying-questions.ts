import type { ChatMessage, BoardSnapshot } from "../types"

export function buildClarifyingQuestionsPrompt({
  question,
  answer,
  priorAnswers,
  prompt,
  snapshot,
}: {
  question: string
  answer: string
  priorAnswers: string
  prompt: string
  snapshot?: BoardSnapshot
}): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are Storyteller, an AI that turns natural-language requirements into a living requirements board. " +
        "You are continuing a Q&A conversation with the user to clarify their request. " +
        "You MUST respond with JSON matching exactly this schema:\n" +
        '{"kind":"board","epics":[{"name":string,"description":string,"order":int,' +
        '"stories":[{"title":string,"description":string,"acceptanceCriteria":string[],' +
        '"priority":"low|medium|high|critical","suggestedStatus":"backlog|todo|in_progress|review|done"}]}]}\n' +
        "OR if you still need clarification, respond with:\n" +
        '{"kind":"clarifying","questions":[{"question":string,"options":[string]}]}\n' +
        "No markdown fences, no prose — only the JSON object.",
    },
    {
      role: "user",
      content:
        `Original prompt:\n${prompt}\n\n` +
        (snapshot
          ? `Existing board snapshot:\n${JSON.stringify(snapshot)}\n\n`
          : "") +
        `Previous answers:\n${priorAnswers}\n\n` +
        `Question asked: ${question}\n` +
        `User's answer: ${answer}\n\n` +
        "Generate the board now, or ask further clarifying questions if still ambiguous.",
    },
  ]
}
