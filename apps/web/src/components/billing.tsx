import { useState } from "react"
import { useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { ExternalLink } from "lucide-react"
import type { PlanId } from "@workspace/schemas"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  useBilling,
  useCheckout,
  useDowngrade,
  useUsage,
  handleLimitError,
} from "@/hooks/use-billing"
import { useToast } from "@/stores/toast-store"
import { PlanCards } from "@/components/plan-cards"
import { UsageMeters } from "@/components/usage-meters"
import { PlanChangeDialog } from "@/components/plan-change-dialog"

const PLAN_NAMES: Record<PlanId, string> = { free: "Free", pro: "Pro" }

/**
 * Billing page body (UI-SPEC V2a/V2b/V2c/V2d/V2e): current-plan card, plan
 * grid, usage meters, downgrade dialog, plus loading skeletons and the
 * error/retry banner. 402s from checkout/downgrade route through
 * handleLimitError (limit-banner + destructive toast), never the generic copy.
 */
export function Billing() {
  const { orgId } = useParams<{ orgId: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const billing = useBilling(orgId)
  const usage = useUsage(orgId)
  const checkout = useCheckout(orgId ?? "")
  const downgrade = useDowngrade(orgId ?? "")
  const [dialogOpen, setDialogOpen] = useState(false)

  const onCheckoutError = (error: unknown) => {
    if (handleLimitError(error, orgId ?? "", queryClient)) return
    toast.error("Couldn't update your plan. Try again.")
  }

  const onDowngradeError = (error: unknown) => {
    if (handleLimitError(error, orgId ?? "", queryClient)) return
    toast.error("Couldn't update your plan. Try again.")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>

      {billing.isLoading ? (
        <div className="space-y-2" data-testid="billing-loading">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : billing.isError ? (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          data-testid="billing-error"
        >
          <p className="text-sm">Couldn't load billing info.</p>
          <Button
            variant="outline"
            size="sm"
            data-testid="billing-retry"
            onClick={() => billing.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : billing.data ? (
        <>
          <Card data-testid="current-plan">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Current plan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {PLAN_NAMES[billing.data.plan]}
                </p>
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              </div>
              {billing.data.plan === "pro" && billing.data.portalUrl && (
                <a
                  href={billing.data.portalUrl}
                  data-testid="billing-manage"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ExternalLink />
                  Manage billing
                </a>
              )}
            </CardContent>
          </Card>

          <PlanCards
            billing={billing.data}
            onUpgrade={() =>
              checkout.mutate(undefined, { onError: onCheckoutError })
            }
            onDowngrade={() => setDialogOpen(true)}
            upgradePending={checkout.isPending}
          />

          <UsageMeters
            usage={usage.usage}
            limits={usage.limits}
            plan={usage.plan}
          />

          <PlanChangeDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onConfirm={() =>
              downgrade.mutate(undefined, {
                onSuccess: () => toast.success("You're now on the Free plan."),
                onError: onDowngradeError,
              })
            }
            pending={downgrade.isPending}
          />
        </>
      ) : null}
    </div>
  )
}
