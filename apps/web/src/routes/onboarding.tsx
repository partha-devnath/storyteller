import { useState } from "react"
import { useNavigate } from "react-router"
import { FilePlus, Rocket } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { apiClient } from "@/lib/api-client"
import { useOrgs } from "@/hooks/use-orgs"
import { useCreateProject } from "@/hooks/use-projects"
import { dismissOnboarding } from "@/hooks/use-onboarding"
import { useBoardStore } from "@/stores/board-store"
import { TemplateCard } from "@/components/template-card"

type Envelope<T> = { success: boolean; data: T }
type TemplateResult = { slug: string }

const WELCOME_COPY =
  "Turn a product idea into a living requirements board — AI generates, reviews, and keeps your stories in sync."

/**
 * 2-step onboarding flow (UI-SPEC V3): welcome → template pick. Blank board
 * creates an empty project via useCreateProject (POST /api/projects), the
 * sample card POSTs /api/orgs/:orgId/projects/template, and skip dismisses
 * onboarding for the session before landing on /projects.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [pending, setPending] = useState<"blank" | "sample" | null>(null)
  const [error, setError] = useState(false)
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { data: orgs, isLoading } = useOrgs()
  const orgId = selectedOrgId ?? orgs?.[0]?.id ?? ""
  const orgName = orgs?.[0]?.name
  const createProject = useCreateProject()

  async function createBlank() {
    setError(false)
    setPending("blank")
    try {
      const result = await createProject.mutateAsync({
        orgId,
        name: "Untitled board",
      })
      navigate(`/projects/${result.slug}`)
    } catch {
      setError(true)
    } finally {
      setPending(null)
    }
  }

  async function createSample() {
    setError(false)
    setPending("sample")
    try {
      const res = await apiClient<Envelope<TemplateResult>>(
        `/api/orgs/${orgId}/projects/template`,
        { method: "POST", body: { templateId: "product-launch" } }
      )
      navigate(`/projects/${res.data.slug}`)
    } catch {
      setError(true)
    } finally {
      setPending(null)
    }
  }

  function skip() {
    dismissOnboarding()
    navigate("/projects")
  }

  return (
    <div className="mx-auto max-w-md space-y-8 py-12">
      {step === 1 ? (
        <div className="space-y-4" data-testid="onboarding-welcome">
          <h1 className="text-2xl font-semibold">
            {orgName ? `Welcome to ${orgName}` : "Welcome to Storyteller"}
          </h1>
          <p className="text-sm">{WELCOME_COPY}</p>
          <Button data-testid="onboarding-start" onClick={() => setStep(2)}>
            Get started
          </Button>
        </div>
      ) : (
        <div className="space-y-6" data-testid="onboarding-template">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              How would you like to start?
            </h1>
            <p className="text-sm">
              Pick a template or begin with a blank board.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-24 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div data-testid="onboarding-template-blank">
                <TemplateCard
                  icon={FilePlus}
                  name="Blank board"
                  description="Start from scratch with an empty board."
                  onUseTemplate={createBlank}
                  pending={pending === "blank"}
                />
              </div>
              <div data-testid="onboarding-template-product-launch">
                <TemplateCard
                  icon={Rocket}
                  name="Sample — Product launch"
                  description="A sample requirements board seeded with example epics and stories."
                  onUseTemplate={createSample}
                  pending={pending === "sample"}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">
              Couldn't create your board. Try again.
            </p>
          )}

          <Button variant="ghost" data-testid="onboarding-skip" onClick={skip}>
            Skip for now
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {step === 1 ? "1 of 2" : "2 of 2"}
      </p>
    </div>
  )
}
