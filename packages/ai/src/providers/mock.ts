import type { LLMProvider, ChatMessage } from "../types"

const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 4096)

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function deterministicEmbedding(text: string): number[] {
  const rand = seededRandom(hashString(text))
  const raw = Array.from({ length: EMBEDDING_DIMENSIONS }, () => rand() * 2 - 1)
  const magnitude = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1
  return raw.map((v) => v / magnitude)
}

const GENERATE_BOARD_JSON = JSON.stringify({
  kind: "board",
  epics: [
    {
      name: "Loyalty Program",
      description: "Core loyalty enrollment and points accrual.",
      order: 0,
      stories: [
        {
          title: "Loyalty enrollment flow",
          description:
            "Users sign up for the loyalty program from their account.",
          acceptanceCriteria: [
            "User can enroll from account settings",
            "Enrollment is confirmed with a success screen",
          ],
          priority: "high",
          suggestedStatus: "todo",
        },
        {
          title: "Loyalty points accrual",
          description: "Earn points on qualifying purchases.",
          acceptanceCriteria: [
            "Points accrue on qualifying purchases",
            "Points balance updates immediately",
          ],
          priority: "high",
          suggestedStatus: "backlog",
        },
      ],
    },
    {
      name: "Rewards Catalog",
      description: "Catalog of rewards redeemable with points.",
      order: 1,
      stories: [
        {
          title: "Loyalty rewards catalog",
          description: "Browse and redeem rewards from the catalog.",
          acceptanceCriteria: [
            "Rewards are listed with point costs",
            "Users can redeem rewards with available points",
          ],
          priority: "medium",
          suggestedStatus: "backlog",
        },
      ],
    },
  ],
})

const CLARIFYING_JSON = JSON.stringify({
  kind: "clarifying",
  questions: [
    {
      question: "Which user base should the loyalty program target?",
      options: ["All users", "New users only", "High-value users"],
    },
    {
      question: "Should points expire after a set period?",
      options: ["Yes", "No"],
    },
  ],
})

const PROCESS_JSON = JSON.stringify({
  changes: [
    {
      change_type: "create",
      card: {
        title: "Loyalty points accrual",
        description: "Earn points on qualifying purchases.",
        acceptanceCriteria: [
          "Points accrue on qualifying purchases",
          "Points balance updates immediately",
        ],
        status: "backlog",
        priority: "high",
        epic_name: "Loyalty Program",
      },
      relation_summary: [
        {
          type: "dependency",
          target_card_id: "loyalty-enroll",
          note: "Depends on enrollment flow",
        },
      ],
      conflict_flags: [],
    },
    {
      change_type: "update",
      target_card_id: "loyalty-rewards-catalog",
      fields: {
        title: "Loyalty rewards catalog (v2)",
        priority: "high",
      },
      relation_summary: [],
      conflict_flags: [],
    },
  ],
})

const REVIEW_JSON = JSON.stringify({
  flags: [
    {
      card_id: "loyalty-enroll",
      type: "contradiction",
      summary: "The description conflicts with the points accrual story.",
    },
  ],
})

export function createMockProvider(): LLMProvider {
  return {
    async chat(messages: ChatMessage[]): Promise<string> {
      const system = messages.find((m) => m.role === "system")?.content ?? ""
      const last = [...messages].reverse().find((m) => m.role === "user")
      const content = last?.content ?? ""

      if (system.includes("CRITICAL RULE")) {
        return PROCESS_JSON
      }
      if (system.includes("reviewing a requirements board")) {
        return REVIEW_JSON
      }
      if (content.toLowerCase().includes("clarif") || content.length < 20) {
        return CLARIFYING_JSON
      }
      return GENERATE_BOARD_JSON
    },

    async embed(texts: string[]): Promise<number[][]> {
      return texts.map(deterministicEmbedding)
    },
  }
}
