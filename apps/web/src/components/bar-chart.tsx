import { Card } from "@workspace/ui/components/card"

export type BarChartPoint = { date: string; value: number }
export type BarChartColorVar = "chart-1" | "chart-2" | "chart-3"

export type BarChartProps = {
  title: string
  data: BarChartPoint[]
  colorVar: BarChartColorVar
  testId: string
}

const VIEWBOX_WIDTH = 560
const VIEWBOX_HEIGHT = 160
const BAR_AREA_HEIGHT = 140
const BAR_GAP = 4

// Fixed metric-color mapping (UI-SPEC Color contract): chart-1 cards created,
// chart-2 proposals approved, chart-3 comments posted. Tokens only — no hex.
const FILLS: Record<BarChartColorVar, string> = {
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
}

/**
 * Custom SVG bar chart (UI-SPEC V5b — no recharts, T-03-SC). One rect per
 * series point with the fixed metric color token, rx=2 rounded caps, a native
 * <title> tooltip, and data-value anchors. Charts are decorative (aria-hidden)
 * — the stat cards carry the accessible values. Zero-value points render a 2px
 * stub baseline; an all-zero/empty series renders nothing (parent shows the
 * V5c empty state). No axes or ticks.
 */
export function BarChart({ title, data, colorVar, testId }: BarChartProps) {
  const total = data.reduce((sum, point) => sum + point.value, 0)
  if (data.length === 0 || total === 0) return null

  const metric = testId.replace("analytics-chart-", "")
  const max = Math.max(...data.map((point) => point.value), 1)
  const slot = VIEWBOX_WIDTH / data.length
  const barWidth = Math.max(2, slot - BAR_GAP)

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">Last 30 days</p>
      </div>
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        className="mt-4 h-40 w-full"
        aria-hidden="true"
        data-testid={testId}
      >
        {data.map((point, index) => {
          const valueScaled = (point.value / max) * BAR_AREA_HEIGHT
          const height = point.value === 0 ? 2 : Math.max(2, valueScaled)
          const y = VIEWBOX_HEIGHT - height
          const x = index * slot + BAR_GAP / 2
          return (
            <rect
              key={`${point.date}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx={2}
              style={{ fill: FILLS[colorVar] }}
              data-testid={`analytics-bar-${metric}-${index}`}
              data-value={point.value}
            >
              <title>{`${point.date}: ${point.value}`}</title>
            </rect>
          )
        })}
      </svg>
    </Card>
  )
}
