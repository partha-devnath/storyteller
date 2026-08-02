import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { AnalyticsState } from "@workspace/schemas"

const mockUseAnalytics = vi.fn()

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: (orgId: string | undefined) => mockUseAnalytics(orgId),
}))

const { AnalyticsPage } = await import("../analytics")

function state(overrides?: Partial<AnalyticsState>): AnalyticsState {
  return {
    totals: {
      cardsCreated: 5,
      proposalsApproved: 2,
      commentsPosted: 8,
      activeMembers: 3,
    },
    series: {
      cardsCreated: [{ date: "2026-08-01", value: 5 }],
      proposalsApproved: [{ date: "2026-08-01", value: 2 }],
      commentsPosted: [{ date: "2026-08-01", value: 8 }],
    },
    generatedAt: "2026-08-02T00:00:00Z",
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/orgs/org1/analytics"]}>
        <AnalyticsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AnalyticsPage", () => {
  it("renders 4 stat cards with values from the API", () => {
    mockUseAnalytics.mockReturnValue({
      data: state(),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByTestId("analytics-stat-cardsCreated")).toHaveTextContent(
      "5"
    )
    expect(
      screen.getByTestId("analytics-stat-proposalsApproved")
    ).toHaveTextContent("2")
    expect(
      screen.getByTestId("analytics-stat-commentsPosted")
    ).toHaveTextContent("8")
    expect(
      screen.getByTestId("analytics-stat-activeMembers")
    ).toHaveTextContent("3")
    expect(
      screen.getByTestId("analytics-chart-cardsCreated")
    ).toBeInTheDocument()
    expect(screen.queryByTestId("analytics-empty-cta")).not.toBeInTheDocument()
  })

  it("renders the empty state when all totals are zero", () => {
    mockUseAnalytics.mockReturnValue({
      data: state({
        totals: {
          cardsCreated: 0,
          proposalsApproved: 0,
          commentsPosted: 0,
          activeMembers: 0,
        },
        series: {
          cardsCreated: [{ date: "2026-08-01", value: 0 }],
          proposalsApproved: [{ date: "2026-08-01", value: 0 }],
          commentsPosted: [{ date: "2026-08-01", value: 0 }],
        },
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByText("No activity yet")).toBeInTheDocument()
    expect(screen.getByTestId("analytics-empty-cta")).toBeInTheDocument()
    expect(
      screen.queryByTestId("analytics-stat-cardsCreated")
    ).not.toBeInTheDocument()
  })

  it("renders the error banner with a retry button", () => {
    mockUseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    })

    renderPage()

    expect(screen.getByText("Couldn't load analytics.")).toBeInTheDocument()
    expect(screen.getByTestId("analytics-retry")).toBeInTheDocument()
  })
})
