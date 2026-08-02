import { z } from "zod"

export const checkoutTierSchema = z.object({
  tier: z.enum(["free", "pro"]),
})

export const templateCreateSchema = z.object({
  templateId: z.enum(["product-launch"]),
})

export const analyticsRangeSchema = z.object({
  range: z.enum(["30d"]).default("30d"),
})
