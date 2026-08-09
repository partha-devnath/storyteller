import { z } from "zod"
import { DEFAULT_CARD_SECTIONS } from "../db/project"

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

export const cardSectionSchema = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "Section key must be camelCase"),
  label: z
    .string()
    .min(1, "Section label is required")
    .max(60, "Section label must be at most 60 characters"),
  description: z
    .string()
    .min(1, "Section description is required")
    .max(300, "Section description must be at most 300 characters"),
  builtIn: z.boolean(),
})

export const updateCardSectionsSchema = z.object({
  cardSections: z
    .array(cardSectionSchema)
    .max(20, "At most 20 card sections are allowed")
    .superRefine((sections, ctx) => {
      const seen = new Set<string>()
      for (const [i, s] of sections.entries()) {
        if (seen.has(s.key)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "key"],
            message: `Duplicate section key: ${s.key}`,
          })
        }
        seen.add(s.key)
        if (s.builtIn && !DEFAULT_CARD_SECTIONS.some((d) => d.key === s.key)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "builtIn"],
            message: `Unknown built-in section key: ${s.key}`,
          })
        }
      }
      for (const [i, d] of DEFAULT_CARD_SECTIONS.entries()) {
        const actual = sections[i]
        if (
          !actual ||
          actual.key !== d.key ||
          actual.label !== d.label ||
          actual.description !== d.description ||
          actual.builtIn !== d.builtIn
        ) {
          ctx.addIssue({
            code: "custom",
            path: [i],
            message: `Built-in section "${d.key}" must be present unchanged at position ${i}`,
          })
        }
      }
    }),
})
