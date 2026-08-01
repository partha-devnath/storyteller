import { index, pgTable, text, timestamp, vector } from "drizzle-orm/pg-core"
import { card } from "./card"
import { cardVersion } from "./card-version"

export const cardEmbedding = pgTable(
  "card_embedding",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id, { onDelete: "cascade" }),
    versionId: text("version_id").references(() => cardVersion.id),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
)
