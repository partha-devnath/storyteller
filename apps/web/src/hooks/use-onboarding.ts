import { useQueries } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useOrgs } from "./use-orgs"

type Envelope<T> = { success: boolean; data: T }

type ProjectSummary = {
  id: string
  name: string
}

const SKIP_KEY = "storyteller:onboarding-skipped"

export function isOnboardingSkipped(): boolean {
  if (typeof window === "undefined") return false
  return window.sessionStorage.getItem(SKIP_KEY) === "1"
}

export function dismissOnboarding(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(SKIP_KEY, "1")
}

/**
 * First-run detection: a user with zero projects across ALL their orgs
 * needs onboarding. Queries reuse the ["projects", orgId] cache so the
 * existing useProjects data (board lists) satisfies the check without
 * duplicate fetches.
 */
export function useOnboarding() {
  const orgsQuery = useOrgs()
  const orgs = orgsQuery.data ?? []
  const orgIds = orgs.map((o) => o.id)

  const projectQueries = useQueries({
    queries: orgIds.map((orgId) => ({
      queryKey: ["projects", orgId],
      queryFn: async () => {
        const res = await apiClient<Envelope<ProjectSummary[]>>(
          `/api/projects?orgId=${encodeURIComponent(orgId)}`
        )
        return res.data
      },
      enabled: orgsQuery.isSuccess,
    })),
  })

  const checked =
    orgsQuery.isSuccess &&
    (orgIds.length === 0 || projectQueries.every((q) => q.isSuccess))
  const projectCount = projectQueries.reduce(
    (sum, q) => sum + (q.data?.length ?? 0),
    0
  )
  const needsOnboarding = checked && projectCount === 0

  return { needsOnboarding, checked, isOnboardingSkipped, dismissOnboarding }
}
