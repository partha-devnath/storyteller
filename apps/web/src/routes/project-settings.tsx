import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { useProject, useDeleteProject } from "@/hooks/use-projects"
import { ProjectTabs } from "@/components/project-tabs"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { toast } from "@/stores/toast-store"
import { cn } from "@workspace/ui/lib/utils"
import { LayoutGrid, ShieldAlert, Trash2 } from "lucide-react"

type Section = "columns" | "sections" | "danger"

const NAV: { key: Section; label: string; icon: typeof LayoutGrid }[] = [
  { key: "columns", label: "Board columns", icon: LayoutGrid },
  { key: "sections", label: "Card sections", icon: LayoutGrid },
  { key: "danger", label: "Danger zone", icon: ShieldAlert },
]

export function ProjectSettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: projectDetail } = useProject(slug)
  const deleteProject = useDeleteProject()
  const [section, setSection] = useState<Section>("columns")
  const [confirmText, setConfirmText] = useState("")

  const columns = projectDetail?.project.columns ?? []
  const cardSections = projectDetail?.project.cardSections ?? []
  const projectName = projectDetail?.project.name ?? ""

  async function handleDelete() {
    if (confirmText !== projectName) {
      toast.error("Type the board name to confirm deletion")
      return
    }
    try {
      await deleteProject.mutateAsync(slug ?? "")
      toast.success("Board deleted")
      navigate("/projects")
    } catch (e) {
      toast.error((e as Error).message ?? "Could not delete board")
    }
  }

  return (
    <div className="space-y-4">
      <ProjectTabs slug={slug ?? ""} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-extrabold tracking-tight">
            {projectName} — Settings
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Configure this board.
          </p>
        </div>
      </div>

      <div className="flex min-w-0 gap-4">
        <nav className="flex w-52 shrink-0 flex-col gap-0.5">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                section === item.key
                  ? "bg-primary/10 font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "size-4",
                  section === item.key
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {section === "columns" && (
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-[15px] font-semibold">Board columns</h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                The swimlane columns on this board.
              </p>
              <div className="mt-4 space-y-2">
                {columns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No columns.</p>
                ) : (
                  columns.map((col, i) => (
                    <div
                      key={col.key}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="font-medium">{col.title}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {section === "sections" && (
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="text-[15px] font-semibold">Card sections</h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Sections the AI generates on each new card.
              </p>
              <div className="mt-4 space-y-2">
                {cardSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No custom sections.
                  </p>
                ) : (
                  cardSections.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {s.label}
                          {s.builtIn && (
                            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                              built-in
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {section === "danger" && (
            <section className="rounded-xl border border-destructive/30 bg-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-destructive">
                <Trash2 className="size-4" />
                Delete board
              </h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Permanently delete "{projectName}" and all its cards, epics,
                proposals, and chat history. This cannot be undone.
              </p>
              <div className="mt-4 max-w-sm space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="delete-confirm">
                    Type <b>{projectName}</b> to confirm
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={projectName}
                  />
                </div>
                <Button
                  variant="destructive"
                  data-testid="delete-board"
                  disabled={
                    deleteProject.isPending || confirmText !== projectName
                  }
                  onClick={handleDelete}
                >
                  {deleteProject.isPending ? "Deleting..." : "Delete board"}
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
