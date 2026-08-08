import { useState } from "react"
import { useNavigate } from "react-router"
import { LIMIT_METRICS, type LimitMetric } from "@workspace/schemas"
import { useBilling } from "@/hooks/use-billing"
import { Button } from "@workspace/ui/components/button"
import { X } from "lucide-react"

const METRIC_LABELS: Record<LimitMetric, string> = {
  projects: "project",
  members: "member",
  aiActions: "AI action",
  cards: "card",
}

/**
 * Global over-limit banner mounted in the app shell above the outlet.
 * Renders nothing while billing data is loading/absent (no flash).
 * Dismissible — the close state survives route changes while the shell is
 * mounted but resets on a full reload.
 */
export function LimitBanner({ orgId }: { orgId: string | undefined }) {
  const navigate = useNavigate()
  const { data: billing } = useBilling(orgId)
  const [dismissed, setDismissed] = useState(false)

  if (!billing) return null

  const metric = LIMIT_METRICS.find(
    (m) => billing.usage[m] >= (billing.limits[m] ?? Infinity)
  )
  if (!metric || dismissed) return null

  return (
    <div
      className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2"
      data-testid="limit-banner"
      data-limit-metric={metric}
    >
      <p className="text-sm">
        You've reached your {billing.plan} {METRIC_LABELS[metric]} limit.
      </p>
      <Button
        variant="default"
        size="sm"
        data-testid="limit-banner-upgrade"
        onClick={() => navigate(`/orgs/${orgId}/billing`)}
      >
        Upgrade to Pro
      </Button>
      <button
        aria-label="Dismiss limit banner"
        data-testid="limit-banner-dismiss"
        onClick={() => setDismissed(true)}
        className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
