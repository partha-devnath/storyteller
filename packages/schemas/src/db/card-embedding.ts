import { pgTable, text, timestamp, vector } from "drizzle-orm/pg-core"
import { card } from "./card"
import { cardVersion } from "./card-version"

export const cardEmbedding = pgTable(
  "card_embedding",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id, { onDelete: "cascade" }),
    versionId: text("version_id").references(() => cardVersion.id, {
      onDelete: "cascade",
    }),
    embedding: vector("embedding", { dimensions: 4096 }).notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  () => []
)
