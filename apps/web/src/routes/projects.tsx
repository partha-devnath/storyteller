import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useBoardStore } from "@/stores/board-store"
import { useProjects, useCreateProject } from "@/hooks/use-projects"
import { useOrgs } from "@/hooks/use-orgs"
import { useAuth } from "@/hooks/use-auth"
import { useUsage, handleLimitError } from "@/hooks/use-billing"
import { toast } from "@/stores/toast-store"
import { Sparkles } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"

type CreateForm = { name: string; description?: string }

const BOARD_COLORS = ["#60a5fa", "#38bdf8", "#22c55e", "#fbbf24", "#fb7185"]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { data: orgs } = useOrgs()
  const orgId = selectedOrgId ?? orgs?.[0]?.id ?? ""
  const { user } = useAuth()
  const { data: projects, isLoading } = useProjects(orgId)
  const createProject = useCreateProject()
  const usage = useUsage(orgId)
  const projectsLimited = usage.isAtLimit("projects")
  const [showForm, setShowForm] = useState(false)
  const [quickPrompt, setQuickPrompt] = useState("")
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>()

  const pendingTotal =
    projects?.reduce((sum, p) => sum + p.pendingProposals, 0) ?? 0
  const orgName = orgs?.find((o) => o.id === orgId)?.name ?? "your workspace"
  const firstName = user?.name?.split(" ")[0] ?? "there"

  async function onSubmit(data: CreateForm) {
    try {
      const result = await createProject.mutateAsync({
        orgId,
        name: data.name,
        description: data.description,
      })
      reset()
      setShowForm(false)
      navigate(`/projects/${result.slug}`)
    } catch (error) {
      if (!handleLimitError(error, orgId, queryClient)) {
        toast.error(
          (error as Error).message ?? "Something went wrong. Try again."
        )
      }
    }
  }

  async function onCreateQuick() {
    const name = quickPrompt.trim()
    if (!name) return
    try {
      const result = await createProject.mutateAsync({ orgId, name })
      setQuickPrompt("")
      navigate(`/projects/${result.slug}`)
    } catch (error) {
      if (!handleLimitError(error, orgId, queryClient)) {
        toast.error(
          (error as Error).message ?? "Something went wrong. Try again."
        )
      }
    }
  }

  const newBoardButton = (
    <Button onClick={() => setShowForm((s) => !s)} disabled={projectsLimited}>
      {showForm ? "Cancel" : "New board"}
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {pendingTotal > 0
              ? `${pendingTotal} pending proposal${pendingTotal === 1 ? "" : "s"} across ${orgName} need your review.`
              : `${projects?.length ?? 0} board${(projects?.length ?? 0) === 1 ? "" : "s"} in ${orgName}.`}
          </p>
        </div>
        {projectsLimited ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="inline-flex" data-testid="limit-tooltip" />
              }
            >
              {newBoardButton}
            </TooltipTrigger>
            <TooltipContent>Limit reached — upgrade to Pro</TooltipContent>
          </Tooltip>
        ) : (
          newBoardButton
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="grid size-9.5 shrink-0 place-items-center rounded-[10px] border border-primary/25 bg-primary/10 text-primary">
          <Sparkles className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Create a new board with AI</p>
          <p className="text-[12.5px] text-muted-foreground">
            Describe the product area, and Storyteller drafts the first
            requirement cards.
          </p>
        </div>
        <Input
          value={quickPrompt}
          onChange={(e) => setQuickPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreateQuick()
          }}
          placeholder="e.g. Mobile app onboarding flow…"
          className="min-w-[180px] flex-1 bg-background"
        />
        <Button onClick={onCreateQuick} disabled={createProject.isPending}>
          {createProject.isPending ? "Creating..." : "Generate board"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create a board</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name", { required: "Name is required" })}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register("description")} />
              </div>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            Active requirement boards
          </h2>
          <span className="text-xs text-muted-foreground">
            Sort: recently active
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading boards...</p>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.slug}`)}
                className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-lg"
              >
                <span
                  className="absolute top-0 right-0 left-0 h-0.5"
                  style={{
                    background: BOARD_COLORS[i % BOARD_COLORS.length],
                    opacity: 0.85,
                  }}
                />
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold">{p.name}</h3>
                  {p.pendingProposals > 0 && (
                    <span className="shrink-0 rounded border border-warn/30 bg-warn/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warn">
                      {p.pendingProposals} pending
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">
                    {p.description}
                  </p>
                )}
                <div className="mt-3 flex gap-4 border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
                  <span>
                    <b className="mr-1 font-mono font-semibold text-foreground">
                      {p.cardCount}
                    </b>
                    cards
                  </span>
                  <span>
                    <b className="mr-1 font-mono font-semibold text-foreground">
                      {p.frozenCount}
                    </b>
                    frozen
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  {p.lastActivity
                    ? `Active ${timeAgo(p.lastActivity)}`
                    : "No activity yet"}
                </div>
              </button>
            ))}

            <button
              onClick={() => setShowForm(true)}
              disabled={projectsLimited}
              className="border-1.5 grid min-h-[150px] place-items-center rounded-2xl border-dashed border-border text-center text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-muted-foreground"
            >
              <span>
                <span className="mx-auto mb-2 grid size-9 place-items-center rounded-[10px] border border-border bg-card">
                  <Sparkles className="size-4" />
                </span>
                New board
              </span>
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No boards yet. Create your first board to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
