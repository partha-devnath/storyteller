import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { project } from "./project"
import { user } from "./users"

export const chatSession = pgTable("chat_session", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
