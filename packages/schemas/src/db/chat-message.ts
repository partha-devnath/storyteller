import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { project } from "./project"
import { proposal } from "./proposal"

export const chatMessage = pgTable("chat_message", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "ai">().notNull(),
  kind: text("kind")
    .$type<"prompt" | "board" | "clarifying" | "error">()
    .notNull(),
  content: text("content").notNull().default(""),
  questions: json("questions")
    .$type<{ question: string; options?: string[] }[] | null>()
    .default(null),
  proposalId: text("proposal_id").references(() => proposal.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
