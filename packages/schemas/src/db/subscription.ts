import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { organization } from "./organization"

export const subscription = pgTable(
  "subscription",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    plan: text("plan").$type<"free" | "pro">().notNull().default("free"),
    status: text("status")
      .$type<"active" | "past_due" | "canceled">()
      .notNull()
      .default("active"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("subscription_org_id_unique").on(table.orgId)]
)
