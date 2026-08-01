import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { card } from "./card"
import { project } from "./project"

export const cardRelation = pgTable("card_relation", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => project.id, { onDelete: "cascade" }),
  sourceCardId: text("source_card_id")
    .notNull()
    .references(() => card.id, { onDelete: "cascade" }),
  targetCardId: text("target_card_id")
    .notNull()
    .references(() => card.id, { onDelete: "cascade" }),
  type: text("type")
    .$type<"dependency" | "hierarchy" | "evolution">()
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
