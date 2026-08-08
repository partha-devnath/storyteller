import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { card } from "./card"
import { proposal } from "./proposal"
import { user } from "./users"

export type ProposalChangeRelation = {
  type: "dependency" | "hierarchy" | "evolution"
  sourceCardId?: string
  targetCardId?: string
  note: string
}

export type ProposalChangeConflictFlag = {
  type: "contradiction" | "duplicate" | "conflict"
  summary: string
}

export const proposalChange = pgTable("proposal_change", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id")
    .notNull()
    .references(() => proposal.id, { onDelete: "cascade" }),
  changeType: text("change_type")
    .$type<"create" | "update" | "close">()
    .notNull(),
  targetCardId: text("target_card_id").references(() => card.id, {
    onDelete: "cascade",
  }),
  newData: json("new_data").$type<Record<string, unknown>>().notNull(),
  relationSummary: json("relation_summary")
    .$type<ProposalChangeRelation[]>()
    .notNull(),
  conflictFlags: json("conflict_flags")
    .$type<ProposalChangeConflictFlag[]>()
    .notNull(),
  approverId: text("approver_id").references(() => user.id),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
