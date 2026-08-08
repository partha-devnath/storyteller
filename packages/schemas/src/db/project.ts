import {
  json,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { organization } from "./organization"

export type ProjectColumn = { key: string; title: string }
export type ProjectCustomField = {
  name: string
  type: "text" | "dropdown" | "date"
  options?: string[]
  required: boolean
  order: number
}

export type CardSection = {
  key: string
  label: string
  description: string
  builtIn: boolean
}

export const DEFAULT_CARD_SECTIONS: CardSection[] = [
  {
    key: "description",
    label: "Description",
    description: "What the requirement does and why it matters.",
    builtIn: true,
  },
  {
    key: "acceptanceCriteria",
    label: "Acceptance criteria",
    description:
      "The concrete checks that must pass for the requirement to be done.",
    builtIn: true,
  },
]

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    columns: json("columns").$type<ProjectColumn[]>().notNull(),
    customFields: json("custom_fields").$type<ProjectCustomField[]>(),
    cardSections: json("card_sections")
      .$type<CardSection[]>()
      .notNull()
      .default(DEFAULT_CARD_SECTIONS),
    status: text("status")
      .$type<"active" | "archived">()
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("project_org_id_slug_unique").on(table.orgId, table.slug),
  ]
)
