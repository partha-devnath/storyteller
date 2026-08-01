import { z } from "zod"

export const createProposalInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  instruction: z.string().min(1, "Instruction is required"),
})

export const rejectProposalSchema = z.object({
  reason: z
    .string()
    .max(500, "Reason must be at most 500 characters")
    .optional(),
})

export type CreateProposalInput = z.infer<typeof createProposalInputSchema>
export type RejectProposalInput = z.infer<typeof rejectProposalSchema>
