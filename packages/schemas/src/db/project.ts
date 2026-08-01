import {
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { organization } from "./organization"

export type ProjectColumn = { key: string; title: string }
export type ProjectCustomField = {
  name: string
  type: "text" | "dropdown" | "date"
  options?: string[]
  required: boolean
  order: number
}

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    columns: json("columns").$type<ProjectColumn[]>().notNull(),
    customFields: json("custom_fields").$type<ProjectCustomField[]>(),
    status: text("status")
      .$type<"active" | "archived">()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_org_id_slug_unique").on(table.orgId, table.slug),
  ]
)
