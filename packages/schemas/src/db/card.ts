import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { epic } from "./epic"
import { project } from "./project"
import { user } from "./users"

export const card = pgTable(
  "card",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    epicId: text("epic_id").references(() => epic.id),
    title: text("title").notNull(),
    description: text("description"),
    acceptanceCriteria: json("acceptance_criteria")
      .$type<string[]>()
      .notNull()
      .default([]),
    status: text("status")
      .$type<"backlog" | "todo" | "in_progress" | "review" | "done">()
      .notNull(),
    priority: text("priority")
      .$type<"low" | "medium" | "high" | "critical">()
      .notNull(),
    assigneeId: text("assignee_id").references(() => user.id),
    customFields: json("custom_fields").$type<Record<string, string>>(),
    isClosed: boolean("is_closed").notNull().default(false),
    closedBy: text("closed_by").references(() => user.id),
    closedAt: timestamp("closed_at"),
    keyNo: integer("key_no").notNull().default(0),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("card_project_id_slug_unique").on(table.projectId, table.slug),
  ]
)
