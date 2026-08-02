import { useNavigate, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { useAnalytics } from "@/hooks/use-analytics"
import { StatCard } from "@/components/stat-card"
import { BarChart } from "@/components/bar-chart"

const EMPTY_HEADING = "No activity yet"
const EMPTY_BODY =
  "Generate your first story cards, approve a proposal, or post a comment — your team's usage stats will appear here."

/**
 * Analytics dashboard (UI-SPEC V5): 4 stat cards + 3 custom SVG bar charts
 * (token colors per metric) with loading skeletons, the V5c empty state, and
 * the V5d error/retry banner. Charts are aria-hidden decorative duplicates —
 * the stat cards carry the accessible values.
 */
export function AnalyticsPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const analytics = useAnalytics(orgId)

  const isEmpty = Boolean(
    analytics.data &&
    analytics.data.totals.cardsCreated === 0 &&
    analytics.data.totals.proposalsApproved === 0 &&
    analytics.data.totals.commentsPosted === 0 &&
    analytics.data.totals.activeMembers === 0
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {analytics.isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </>
      ) : analytics.isError ? (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
          data-testid="analytics-error"
        >
          <p className="text-sm">Couldn't load analytics.</p>
          <Button
            variant="outline"
            size="sm"
            data-testid="analytics-retry"
            onClick={() => analytics.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : analytics.data ? (
        isEmpty ? (
          <div
            className="flex flex-col items-center gap-3 py-24 text-center"
            data-testid="analytics-empty"
          >
            <h2 className="text-lg font-semibold">{EMPTY_HEADING}</h2>
            <p className="max-w-md text-sm">{EMPTY_BODY}</p>
            <Button
              data-testid="analytics-empty-cta"
              onClick={() => navigate("/projects")}
            >
              Open Chat
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                value={analytics.data.totals.cardsCreated}
                label="Cards created"
                testId="analytics-stat-cardsCreated"
              />
              <StatCard
                value={analytics.data.totals.proposalsApproved}
                label="Proposals approved"
                testId="analytics-stat-proposalsApproved"
              />
              <StatCard
                value={analytics.data.totals.commentsPosted}
                label="Comments posted"
                testId="analytics-stat-commentsPosted"
              />
              <StatCard
                value={analytics.data.totals.activeMembers}
                label="Active members"
                testId="analytics-stat-activeMembers"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <BarChart
                title="Cards created"
                data={analytics.data.series.cardsCreated}
                colorVar="chart-1"
                testId="analytics-chart-cardsCreated"
              />
              <BarChart
                title="Proposals approved"
                data={analytics.data.series.proposalsApproved}
                colorVar="chart-2"
                testId="analytics-chart-proposalsApproved"
              />
              <BarChart
                title="Comments posted"
                data={analytics.data.series.commentsPosted}
                colorVar="chart-3"
                testId="analytics-chart-commentsPosted"
              />
            </div>
          </>
        )
      ) : null}
    </div>
  )
}
