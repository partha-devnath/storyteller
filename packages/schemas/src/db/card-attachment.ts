import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { card } from "./card"
import { file } from "./files"
import { user } from "./users"

export const cardAttachment = pgTable("card_attachment", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => card.id, { onDelete: "cascade" }),
  fileId: text("file_id")
    .notNull()
    .references(() => file.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
