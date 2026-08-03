import { z } from "zod"

export const chatMessageInputSchema = z.object({
  role: z.enum(["user", "ai"]),
  kind: z.enum(["prompt", "board", "clarifying", "error"]),
  content: z.string().max(10_000, "Content is too long").optional().default(""),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).optional(),
      })
    )
    .nullable()
    .optional()
    .default(null),
  proposalId: z.string().nullable().optional().default(null),
})

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>
