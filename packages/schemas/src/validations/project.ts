import { z } from "zod"

export const DEFAULT_PROJECT_COLUMNS: { key: string; title: string }[] = [
  { key: "backlog", title: "Backlog" },
  { key: "todo", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "review", title: "Review" },
  { key: "done", title: "Done" },
]

export const createProjectSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens"
    )
    .optional(),
  description: z.string().optional(),
  columns: z
    .array(
      z.object({
        key: z.string().min(1, "Column key is required"),
        title: z.string().min(1, "Column title is required"),
      })
    )
    .default(DEFAULT_PROJECT_COLUMNS),
  customFields: z
    .array(
      z.object({
        name: z.string().min(1, "Custom field name is required"),
        type: z.enum(["text", "dropdown", "date"]),
        options: z.array(z.string()).optional(),
        required: z.boolean(),
        order: z.number(),
      })
    )
    .optional(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
