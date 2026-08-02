import { useMemo } from "react"
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import {
  type BillingState,
  type LimitMetric,
  type PlanId,
  type PlanLimits,
} from "@workspace/schemas"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/stores/toast-store"

type Envelope<T> = { success: boolean; data: T }

export function useBilling(orgId: string | undefined) {
  return useQuery({
    queryKey: ["billing", orgId],
    queryFn: async () => {
      const res = await apiClient<Envelope<BillingState>>(
        `/api/orgs/${orgId}/billing`
      )
      return res.data
    },
    enabled: Boolean(orgId),
  })
}

export function useCheckout(orgId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient<Envelope<{ url: string }>>(
        `/api/orgs/${orgId}/billing/checkout`,
        { method: "POST", body: { tier: "pro" } }
      )
      return res.data
    },
    onSuccess: (data) => {
      window.location.href = data.url
    },
  })
}

export function useDowngrade(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient<Envelope<BillingState>>(
        `/api/orgs/${orgId}/billing/downgrade`,
        { method: "POST" }
      )
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", orgId] })
    },
  })
}

export type UsageView = {
  usage: Record<LimitMetric, number>
  limits: PlanLimits
  plan: PlanId | null
  isAtLimit: (metric: LimitMetric) => boolean
  pct: (metric: LimitMetric) => number
}

/**
 * Shared 402 handler for mutation error paths (UI-SPEC V4c). Routes a
 * limit-blocked mutation to the limit surface: invalidates the billing query
 * so the shell's limit-banner reflects server truth, and fires the exact
 * destructive toast copy. Returns true when it handled a 402 — callers then
 * skip their generic error toast.
 */
export function handleLimitError(
  error: unknown,
  orgId: string,
  queryClient: QueryClient
): boolean {
  if ((error as { status?: number } | null)?.status !== 402) return false
  queryClient.invalidateQueries({ queryKey: ["billing", orgId] })
  toast.error("Limit reached — upgrade to Pro to continue.")
  return true
}

const EMPTY_LIMITS: PlanLimits = {
  projects: null,
  members: null,
  aiActions: null,
  cards: null,
}

/**
 * Derived selector over useBilling — drives the usage meters, the limit
 * banner, and the disabled-action tooltips. Server-truth only: every value
 * comes from GET /api/orgs/:orgId/billing; nothing is computed client-side
 * as authoritative.
 */
export function useUsage(orgId: string | undefined): UsageView {
  const { data: billing } = useBilling(orgId)

  return useMemo(() => {
    if (!billing) {
      return {
        usage: { projects: 0, members: 0, aiActions: 0, cards: 0 },
        limits: EMPTY_LIMITS,
        plan: null,
        isAtLimit: () => false,
        pct: () => 0,
      }
    }

    return {
      usage: billing.usage,
      limits: billing.limits,
      plan: billing.plan,
      isAtLimit: (metric: LimitMetric) =>
        billing.usage[metric] >= (billing.limits[metric] ?? Infinity),
      pct: (metric: LimitMetric) => {
        const limit = billing.limits[metric]
        if (limit === null || limit === undefined || limit === 0) return 100
        const pct = (billing.usage[metric] / limit) * 100
        return Math.min(100, Math.round(pct))
      },
    }
  }, [billing])
}
