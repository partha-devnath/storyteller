import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { UsageView } from "@/hooks/use-billing"

const mockUseProjects = vi.fn()
const mockUseCreateProject = vi.fn()
const mockUseOrgs = vi.fn()
const mockUseUsage = vi.fn()

vi.mock("@/hooks/use-projects", () => ({
  useProjects: (orgId: string) => mockUseProjects(orgId),
  useCreateProject: () => mockUseCreateProject(),
}))

vi.mock("@/hooks/use-orgs", () => ({
  useOrgs: () => mockUseOrgs(),
}))

vi.mock("@/hooks/use-billing", () => ({
  useUsage: (orgId: string | undefined) => mockUseUsage(orgId),
  handleLimitError: () => false,
}))

vi.mock("@/stores/board-store", () => ({
  useBoardStore: (selector: (s: { selectedOrgId: string }) => unknown) =>
    selector({ selectedOrgId: "org1" }),
}))

vi.mock("@/stores/toast-store", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const { ProjectsPage } = await import("../projects")

beforeEach(() => {
  vi.clearAllMocks()
})

function usageView(isAtLimit: (metric: string) => boolean): UsageView {
  return {
    usage: { projects: 2, members: 2, aiActions: 10, cards: 100 },
    limits: { projects: 2, members: 5, aiActions: 50, cards: 500 },
    plan: "free",
    isAtLimit: isAtLimit as UsageView["isAtLimit"],
    pct: () => 100,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe("ProjectsPage", () => {
  it("renders the New board button disabled with a limit-tooltip at the projects limit", () => {
    mockUseProjects.mockReturnValue({ data: [], isLoading: false })
    mockUseCreateProject.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    mockUseOrgs.mockReturnValue({ data: [{ id: "org1", name: "Acme" }] })
    mockUseUsage.mockReturnValue(usageView((metric) => metric === "projects"))

    renderPage()

    const button = screen.getByRole("button", { name: "New board" })
    expect(button).toBeDisabled()
    expect(screen.getByTestId("limit-tooltip")).toBeInTheDocument()
  })

  it("keeps New board enabled with no tooltip under the projects limit", () => {
    mockUseProjects.mockReturnValue({ data: [], isLoading: false })
    mockUseCreateProject.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })
    mockUseOrgs.mockReturnValue({ data: [{ id: "org1", name: "Acme" }] })
    mockUseUsage.mockReturnValue(usageView(() => false))

    renderPage()

    const button = screen.getByRole("button", { name: "New board" })
    expect(button).toBeEnabled()
    expect(screen.queryByTestId("limit-tooltip")).not.toBeInTheDocument()

    // existing toggle behavior kept when enabled
    fireEvent.click(button)
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })
})
