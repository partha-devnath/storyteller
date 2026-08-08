import {
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { card } from "./card"
import { proposalChange } from "./proposal-change"
import { user } from "./users"

export const cardVersion = pgTable(
  "card_version",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => card.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    acceptanceCriteria: json("acceptance_criteria").$type<string[]>().notNull(),
    status: text("status")
      .$type<"backlog" | "todo" | "in_progress" | "review" | "done">()
      .notNull(),
    priority: text("priority")
      .$type<"low" | "medium" | "high" | "critical">()
      .notNull(),
    customFields: json("custom_fields").$type<Record<string, string>>(),
    changeType: text("change_type")
      .$type<"create" | "update" | "close">()
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    sourceProposalChangeId: text("source_proposal_change_id").references(
      () => proposalChange.id,
      { onDelete: "cascade" }
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("card_version_card_id_version_no_unique").on(
      table.cardId,
      table.versionNo
    ),
  ]
)
