import { eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { subscription } from "@workspace/schemas"
import type { PlanId } from "@workspace/schemas"
import { generateId } from "../../utils"

export type SubscriptionStatus = "active" | "past_due" | "canceled"

export type SubscriptionState = {
  plan: PlanId
  status: SubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: Date | null
}

const FREE_STATE: SubscriptionState = {
  plan: "free",
  status: "active",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  currentPeriodEnd: null,
}

/**
 * Webhook event shapes accepted by the mock provider and the stripe provider.
 * Stripe's native event objects are normalized into these before any state
 * change, so providers share one transition path (testable, DB-free).
 */
export type SubscriptionEvent =
  | {
      type: "checkout.session.completed"
      orgId: string
      plan: PlanId
      status?: SubscriptionStatus
      stripeCustomerId?: string
      stripeSubscriptionId?: string
      currentPeriodEnd?: Date
    }
  | {
      type: "subscription.updated"
      orgId: string
      plan: PlanId
      status?: SubscriptionStatus
      currentPeriodEnd?: Date
    }
  | {
      type: "subscription.deleted"
      orgId: string
    }

/**
 * Pure mapping from a normalized webhook event to the transition inputs —
 * DB-free, directly unit-tested. Every provider's handleWebhook funnels
 * through this before touching the subscription row.
 */
export function mapSubscriptionEventToState(
  event: SubscriptionEvent
): Pick<
  SubscriptionState,
  | "plan"
  | "status"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
  | "currentPeriodEnd"
> {
  if (event.type === "subscription.deleted") {
    return {
      plan: "free",
      status: "canceled",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    }
  }
  return {
    plan: event.plan,
    status: event.status ?? "active",
    stripeCustomerId:
      event.type === "checkout.session.completed"
        ? (event.stripeCustomerId ?? null)
        : null,
    stripeSubscriptionId:
      event.type === "checkout.session.completed"
        ? (event.stripeSubscriptionId ?? null)
        : null,
    currentPeriodEnd: event.currentPeriodEnd ?? null,
  }
}

export async function getOrgSubscription(
  orgId: string
): Promise<SubscriptionState> {
  const [row] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.orgId, orgId))
    .limit(1)
  if (!row) return FREE_STATE
  return {
    plan: row.plan,
    status: row.status,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    currentPeriodEnd: row.currentPeriodEnd,
  }
}

export async function getOrgPlan(orgId: string): Promise<PlanId> {
  return (await getOrgSubscription(orgId)).plan
}

/** Same read as getOrgPlan but executed on a caller-supplied executor. */
export async function getOrgPlanTx(
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
  orgId: string
): Promise<PlanId> {
  const [row] = await tx
    .select()
    .from(subscription)
    .where(eq(subscription.orgId, orgId))
    .limit(1)
  return row?.plan ?? "free"
}

/** Find the orgId owning a stripe subscription id (webhook sync path). */
export async function getOrgIdByStripeSubscriptionId(
  stripeSubscriptionId: string
): Promise<string | null> {
  const [row] = await db
    .select({ orgId: subscription.orgId })
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1)
  return row?.orgId ?? null
}

export async function applySubscriptionTransition(input: {
  orgId: string
  plan: PlanId
  status?: SubscriptionStatus
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
}): Promise<void> {
  const [existing] = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(eq(subscription.orgId, input.orgId))
    .limit(1)

  if (existing) {
    await db
      .update(subscription)
      .set({
        plan: input.plan,
        status: input.status ?? "active",
        stripeCustomerId:
          input.stripeCustomerId === undefined
            ? undefined
            : input.stripeCustomerId,
        stripeSubscriptionId:
          input.stripeSubscriptionId === undefined
            ? undefined
            : input.stripeSubscriptionId,
        currentPeriodEnd:
          input.currentPeriodEnd === undefined
            ? undefined
            : input.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, existing.id))
    return
  }

  await db.insert(subscription).values({
    id: generateId(),
    orgId: input.orgId,
    plan: input.plan,
    status: input.status ?? "active",
    stripeCustomerId: input.stripeCustomerId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId ?? null,
    currentPeriodEnd: input.currentPeriodEnd ?? null,
  })
}

/** Direct plan set (downgrade path) — upsert with status active. */
export async function setOrgPlan(orgId: string, plan: PlanId): Promise<void> {
  await applySubscriptionTransition({ orgId, plan, status: "active" })
}
