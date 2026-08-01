import {
  json,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { card } from "./card"
import { user } from "./users"

export const comment = pgTable("comment", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => card.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  body: text("body").notNull(),
  parentId: text("parent_id").references((): AnyPgColumn => comment.id),
  mentions: json("mentions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})
