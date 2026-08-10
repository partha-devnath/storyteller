import {
  LIMIT_METRICS,
  type LimitMetric,
  type PlanId,
  type PlanLimits,
} from "@workspace/schemas"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

export type UsageMetersProps = {
  usage: Record<LimitMetric, number>
  limits: PlanLimits
  plan: PlanId | null
}

const LABELS: Record<LimitMetric, string> = {
  projects: "Projects",
  members: "Members",
  aiActions: "AI actions",
  cards: "Cards",
}

/** Raw pct (not rounded/clamped) so the 80/100 boundaries land exactly. */
function rawPct(usage: number, limit: number | null): number | null {
  if (limit === null || limit === undefined || limit === 0) return null
  return (usage / limit) * 100
}

/**
 * Per-metric usage meters (UI-SPEC V2c). Fill-color contract:
 * primary below 80% · warn at >=80% <100% · destructive at >=100%.
 * Null limit (unlimited) renders "Unlimited" with a 0-width fill and no warnings.
 */
export function UsageMeters({ usage, limits }: UsageMetersProps) {
  return (
    <Card data-testid="usage-section">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Usage this month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {LIMIT_METRICS.map((metric) => {
          const limit = limits[metric]
          const value = usage[metric]
          const pct = rawPct(value, limit)
          const atLimit = pct !== null && pct >= 100
          const nearLimit = pct !== null && pct >= 80 && pct < 100
          const fillClass = atLimit
            ? "bg-destructive"
            : nearLimit
              ? "bg-warn"
              : "bg-primary"
          const valueText =
            limit === null || limit === undefined
              ? "Unlimited"
              : `${value} / ${limit}`

          return (
            <div
              key={metric}
              className="space-y-1.5"
              data-testid={`usage-meter-${metric}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold">{LABELS[metric]}</span>
                <span
                  className={cn(
                    "text-xs text-muted-foreground",
                    atLimit && "text-destructive"
                  )}
                  data-testid={`usage-value-${metric}`}
                >
                  {valueText}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", fillClass)}
                  style={{
                    width:
                      pct === null ? "0%" : `${Math.min(100, pct).toString()}%`,
                  }}
                  data-testid={`usage-bar-${metric}`}
                  data-pct={pct === null ? "0" : String(pct)}
                />
              </div>
              {metric === "aiActions" && (
                <p className="text-xs text-muted-foreground">Resets monthly</p>
              )}
              {nearLimit && (
                <p className="text-xs text-warn">
                  {LABELS[metric]} nearly exhausted — upgrade for more headroom.
                </p>
              )}
              {atLimit && (
                <p className="text-xs text-destructive">
                  Limit reached — upgrade to Pro to continue.
                </p>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
