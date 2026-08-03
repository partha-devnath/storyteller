import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import { organization } from "./organization"
import { user } from "./users"

export const organizationMember = pgTable(
  "organization_member",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    role: text("role")
      .$type<"owner" | "admin" | "member" | "viewer">()
      .notNull(),
    invitedEmail: text("invited_email"),
    inviteToken: text("invite_token"),
    inviteExpiresAt: timestamp("invite_expires_at"),
    inviteStatus: text("invite_status").$type<"pending" | "accepted">(),
    invitedBy: text("invited_by").references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_member_org_id_user_id_unique").on(
      table.orgId,
      table.userId
    ),
  ]
)
