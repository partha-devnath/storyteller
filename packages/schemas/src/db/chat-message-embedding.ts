import { pgTable, text, timestamp, vector } from "drizzle-orm/pg-core"
import { chatMessage } from "./chat-message"

export const chatMessageEmbedding = pgTable(
  "chat_message_embedding",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => chatMessage.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 4096 }).notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  () => []
)
