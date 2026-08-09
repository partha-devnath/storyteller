import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { project } from "./project"

export const integrationCredential = pgTable("integration_credential", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  provider: text("provider").$type<"github" | "trello">().notNull(),
  config: json("config").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type IntegrationCredential = typeof integrationCredential.$inferSelect
