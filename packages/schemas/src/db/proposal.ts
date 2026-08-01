import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { project } from "./project"
import { user } from "./users"

export const proposal = pgTable("proposal", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  instruction: text("instruction").notNull(),
  prompt: text("prompt").notNull(),
  aiResponse: text("ai_response").notNull(),
  status: text("status")
    .$type<"pending" | "approved" | "rejected">()
    .notNull()
    .default("pending"),
  approvedBy: text("approved_by").references(() => user.id),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
