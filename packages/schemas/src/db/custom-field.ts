import {
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { project } from "./project"

export type CustomFieldConfig = { options?: string[] }

export const customField = pgTable("custom_field", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").$type<"text" | "dropdown" | "date">().notNull(),
  config: json("config").$type<CustomFieldConfig>(),
  required: boolean("required").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
