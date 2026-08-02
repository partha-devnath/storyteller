import { z } from "zod"

export type PlanId = "free" | "pro"
export type LimitMetric = "projects" | "members" | "aiActions" | "cards"
export type PlanLimits = Record<LimitMetric, number | null> // null = unlimited
export type PlanConfig = {
  id: PlanId
  name: string
  priceUsdMonthly: number
  limits: PlanLimits
}

/**
 * Plan/limits/pricing config — server source of truth (UI-SPEC V2b contract).
 * Prices and limits are compile-time constants; the API never accepts limits
 * from the client. Do not change these numbers without updating the UI-SPEC.
 */
export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceUsdMonthly: 0,
    limits: { projects: 2, members: 5, aiActions: 50, cards: 500 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsdMonthly: 12,
    limits: { projects: null, members: 25, aiActions: 5000, cards: null },
  },
}

export const LIMIT_METRICS: LimitMetric[] = [
  "projects",
  "members",
  "aiActions",
  "cards",
]

export const planIdSchema = z.enum(["free", "pro"])

/** UI-SPEC V2 billing contract — shape returned by GET /api/orgs/:orgId/billing */
export type BillingState = {
  plan: PlanId
  cycle: "monthly"
  price: Record<PlanId, number>
  limits: PlanLimits
  usage: Record<LimitMetric, number>
  checkoutUrl: string | null
  portalUrl: string | null
}

/** UI-SPEC V5 analytics contract — shape returned by GET /api/orgs/:orgId/analytics */
export type AnalyticsState = {
  totals: {
    cardsCreated: number
    proposalsApproved: number
    commentsPosted: number
    activeMembers: number
  }
  series: {
    cardsCreated: { date: string; value: number }[]
    proposalsApproved: { date: string; value: number }[]
    commentsPosted: { date: string; value: number }[]
  }
  generatedAt: string
}
