import { useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useBoardStore } from "@/stores/board-store"
import { useProjects, useCreateProject } from "@/hooks/use-projects"
import { useOrgs } from "@/hooks/use-orgs"

type CreateForm = { name: string; description?: string }

export function ProjectsPage() {
  const navigate = useNavigate()
  const selectedOrgId = useBoardStore((s) => s.selectedOrgId)
  const { data: orgs } = useOrgs()
  const orgId = selectedOrgId ?? orgs?.[0]?.id ?? ""
  const { data: projects, isLoading } = useProjects(orgId)
  const createProject = useCreateProject()
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm<CreateForm>()

  async function onSubmit(data: CreateForm) {
    const result = await createProject.mutateAsync({
      orgId,
      name: data.name,
      description: data.description,
    })
    reset()
    setShowForm(false)
    navigate(`/projects/${result.slug}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Boards</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "New board"}
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
                <Input id="name" {...register("name", { required: true })} />
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading boards...</p>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.slug}`)}
              className="text-left"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {p.description && (
                    <p className="mb-2 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {p.cardCount} cards ·{" "}
                    {p.lastActivity
                      ? `updated ${new Date(p.lastActivity).toLocaleDateString()}`
                      : "no activity"}
                  </p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No boards yet. Create your first board to get started.
          </p>
        </div>
      )}
    </div>
  )
}
