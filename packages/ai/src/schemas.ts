import { z } from "zod"

export const PRIORITY_ENUM = z.enum(["low", "medium", "high", "critical"])
export const STATUS_ENUM = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
])
export const RELATION_TYPE_ENUM = z.enum([
  "dependency",
  "hierarchy",
  "evolution",
])
export const CONFLICT_TYPE_ENUM = z.enum([
  "contradiction",
  "duplicate",
  "conflict",
])

const relationSummarySchema = z
  .array(
    z
      .object({
        type: RELATION_TYPE_ENUM,
        source_card_id: z.string().optional(),
        target_card_id: z.string().optional(),
        note: z.string(),
      })
      .strict()
  )
  .default([])

const conflictFlagsSchema = z
  .array(
    z
      .object({
        type: CONFLICT_TYPE_ENUM,
        summary: z.string(),
      })
      .strict()
  )
  .default([])

export const generateBoardOutputSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("board"),
      epics: z
        .array(
          z
            .object({
              name: z.string().min(1).max(120),
              description: z.string(),
              order: z.number().int(),
              stories: z
                .array(
                  z
                    .object({
                      title: z.string().min(1).max(200),
                      description: z.string(),
                      acceptanceCriteria: z.array(z.string()),
                      priority: PRIORITY_ENUM,
                      suggestedStatus: STATUS_ENUM,
                    })
                    .strict()
                )
                .min(1),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("clarifying"),
      questions: z
        .array(
          z
            .object({
              question: z.string().min(1).max(300),
              options: z.array(z.string()).optional(),
            })
            .strict()
        )
        .min(1),
    })
    .strict(),
])

const processChangeSchema = z.discriminatedUnion("change_type", [
  z
    .object({
      change_type: z.literal("create"),
      card: z
        .object({
          title: z.string().min(1).max(200),
          description: z.string(),
          acceptanceCriteria: z.array(z.string()),
          status: STATUS_ENUM,
          priority: PRIORITY_ENUM,
          epic_name: z.string().optional(),
          custom_fields: z.record(z.string(), z.string()).optional(),
        })
        .strict(),
      relation_summary: relationSummarySchema,
      conflict_flags: conflictFlagsSchema,
    })
    .strict(),
  z
    .object({
      change_type: z.literal("update"),
      target_card_id: z.string().min(1),
      fields: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          acceptanceCriteria: z.array(z.string()).optional(),
          status: STATUS_ENUM.optional(),
          priority: PRIORITY_ENUM.optional(),
          customFields: z.record(z.string(), z.string()).optional(),
        })
        .strict(),
      relation_summary: relationSummarySchema,
      conflict_flags: conflictFlagsSchema,
    })
    .strict(),
  z
    .object({
      change_type: z.literal("close"),
      target_card_id: z.string().min(1),
      reason: z.string(),
      relation_summary: relationSummarySchema,
      conflict_flags: conflictFlagsSchema,
    })
    .strict(),
])

export const processInstructionOutputSchema = z
  .object({
    changes: z.array(processChangeSchema),
  })
  .strict()

export const consistencyReviewOutputSchema = z
  .object({
    flags: z
      .array(
        z
          .object({
            card_id: z.string(),
            type: CONFLICT_TYPE_ENUM,
            summary: z.string().min(1).max(500),
          })
          .strict()
      )
      .default([]),
  })
  .strict()

export const clarifyingAnswersInputSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            question: z.string(),
            answer: z.string(),
          })
          .strict()
      )
      .min(1),
  })
  .strict()

export type GenerateBoardOutput = z.infer<typeof generateBoardOutputSchema>
export type ProcessInstructionOutput = z.infer<
  typeof processInstructionOutputSchema
>
export type ConsistencyReviewOutput = z.infer<
  typeof consistencyReviewOutputSchema
>
export type ClarifyingAnswersInput = z.infer<
  typeof clarifyingAnswersInputSchema
>
