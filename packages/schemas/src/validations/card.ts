import { z } from "zod"

export const CARD_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const

export const CARD_PRIORITIES = ["low", "medium", "high", "critical"] as const

export const createCardSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  status: z.enum(CARD_STATUSES),
  priority: z.enum(CARD_PRIORITIES),
  assigneeId: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  sections: z.record(z.string(), z.string()).optional(),
  attachmentFileIds: z.array(z.string()).optional(),
  epicId: z.string().optional(),
})

export const updateCardSchema = createCardSchema.partial().strict()

export const closeCardSchema = z.object({
  reason: z.string().optional(),
})

export type CreateCardInput = z.infer<typeof createCardSchema>
export type UpdateCardInput = z.infer<typeof updateCardSchema>
export type CloseCardInput = z.infer<typeof closeCardSchema>
