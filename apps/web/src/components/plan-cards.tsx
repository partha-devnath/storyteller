import type { BillingState } from "@workspace/schemas"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { Check } from "lucide-react"

export type PlanCardsProps = {
  billing: BillingState
  onUpgrade: () => void
  onDowngrade: () => void
  upgradePending: boolean
}

const FREE_LIMIT_ROWS = [
  "2 projects",
  "5 members",
  "50 AI actions/mo",
  "500 cards",
]

const PRO_LIMIT_ROWS = [
  "Unlimited projects",
  "25 members",
  "5,000 AI actions/mo",
  "Unlimited cards",
]

type PlanCardProps = {
  testId: string
  name: string
  price: string
  period: string
  rows: string[]
  current: boolean
  cta: React.ReactNode | null
}

function PlanCard({
  testId,
  name,
  price,
  period,
  rows,
  current,
  cta,
}: PlanCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "flex min-h-44 flex-col p-4",
        current && "ring-2 ring-primary"
      )}
    >
      <CardContent className="flex flex-1 flex-col gap-3 p-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{name}</p>
            <p className="text-2xl font-semibold">
              {price}{" "}
              <span className="text-xs text-muted-foreground">{period}</span>
            </p>
          </div>
          {current && (
            <Badge
              className="bg-muted text-muted-foreground"
              data-testid="current-plan-badge"
            >
              Current plan
            </Badge>
          )}
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {rows.map((row) => (
            <li key={row} className="flex items-center gap-1.5">
              <Check className="size-3" />
              {row}
            </li>
          ))}
        </ul>
        <div className="mt-auto">{cta}</div>
      </CardContent>
    </Card>
  )
}

/**
 * Free/Pro plan grid (UI-SPEC V2b). Exactly one current-plan-badge (on the
 * active tier, ring-2 ring-primary) and one CTA on the other tier:
 * free → "Upgrade to Pro" (checkout), pro → "Downgrade to Free" (dialog).
 */
export function PlanCards({
  billing,
  onUpgrade,
  onDowngrade,
  upgradePending,
}: PlanCardsProps) {
  const isFree = billing.plan === "free"

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="plan-grid">
      <PlanCard
        testId="plan-card-free"
        name="Free"
        price="$0"
        period="/mo"
        rows={FREE_LIMIT_ROWS}
        current={isFree}
        cta={
          isFree ? null : (
            <Button
              variant="outline"
              data-testid="plan-select-free"
              onClick={onDowngrade}
              className="text-destructive hover:text-destructive"
            >
              Downgrade to Free
            </Button>
          )
        }
      />
      <PlanCard
        testId="plan-card-pro"
        name="Pro"
        price="$12"
        period="/mo"
        rows={PRO_LIMIT_ROWS}
        current={!isFree}
        cta={
          isFree ? (
            <Button
              data-testid="plan-select-pro"
              onClick={onUpgrade}
              disabled={upgradePending}
            >
              {upgradePending ? "Redirecting…" : "Upgrade to Pro"}
            </Button>
          ) : null
        }
      />
    </div>
  )
}
