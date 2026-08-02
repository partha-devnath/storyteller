import { Card } from "@workspace/ui/components/card"

export type StatCardProps = {
  value: number
  label: string
  testId: string
}

/**
 * Analytics stat card (UI-SPEC V5a): 24px/600 value + 12px muted label.
 * Carries the accessible value the aria-hidden charts duplicate decoratively.
 */
export function StatCard({ value, label, testId }: StatCardProps) {
  return (
    <Card className="p-4" data-testid={testId}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  )
}
