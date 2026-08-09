import type { ChatHistoryItem } from "../types"

export const BOARD_JSON_EXAMPLE =
  '{"kind":"board","epics":[{"name":"Loyalty Program","description":"Core loyalty enrollment and points accrual.","order":0,"stories":[{"title":"Loyalty enrollment flow","description":"Users sign up for the loyalty program from their account.","acceptanceCriteria":["User can enroll from account settings","Enrollment is confirmed with a success screen"],"priority":"high","suggestedStatus":"todo"}]}]}'

export const CLARIFYING_JSON_EXAMPLE =
  '{"kind":"clarifying","questions":[{"question":"Which user base should the loyalty program target?","options":["All users","New users only","High-value users"]},{"question":"Should points expire after a set period?","options":["Yes","No"]}]}'

export const JSON_OUTPUT_RULES =
  "Respond with ONLY the JSON object matching the schema exactly. " +
  "No markdown fences, no prose, no comments, no trailing text. " +
  "Do not add any keys that are not in the example. " +
  'For empty lists (relationSummary, conflictFlags, acceptanceCriteria, questions) use [] — never the string "none" or "N/A". ' +
  "Optional fields (sections, action, targetCardId, conflictFlags, relationSummary) may be omitted."

export function formatChatHistory(chatHistory: ChatHistoryItem[]): string {
  if (chatHistory.length === 0) return ""
  const lines = chatHistory.map(
    (h) => `- [${h.role}] ${h.content.replace(/\n/g, " ").slice(0, 500)}`
  )
  return `\nRelevant earlier discussion from this project's chat history (most relevant first):\n${lines.join("\n")}`
}
