import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
  useProject,
  useDeleteProject,
  useUpdateProject,
  type CardSectionInput,
} from "@/hooks/use-projects"
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
  const updateProject = useUpdateProject(slug)
  const [section, setSection] = useState<Section>("columns")
  const [confirmText, setConfirmText] = useState("")
  const [addingSection, setAddingSection] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [sectionLabel, setSectionLabel] = useState("")
  const [sectionDescription, setSectionDescription] = useState("")

  const columns = projectDetail?.project.columns ?? []
  const projectName = projectDetail?.project.name ?? ""

  function camelCaseKey(label: string): string {
    const words = label
      .trim()
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
    if (words.length === 0) return "section"
    return (
      words[0] +
      words
        .slice(1)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join("")
    )
  }

  function persistSections(next: CardSectionInput[]) {
    updateProject.mutate(next)
  }

  function handleAddSection() {
    const label = sectionLabel.trim()
    if (!label) return
    const all = projectDetail?.project.cardSections ?? []
    let key = camelCaseKey(label)
    let n = 2
    while (all.some((s) => s.key === key)) {
      key = `${camelCaseKey(label)}${n}`
      n += 1
    }
    persistSections([
      ...all,
      {
        key,
        label,
        description: sectionDescription.trim() || "TBD",
        builtIn: false,
      },
    ])
    setAddingSection(false)
    setSectionLabel("")
    setSectionDescription("")
  }

  function handleSaveEdit(key: string) {
    const label = sectionLabel.trim()
    if (!label) return
    persistSections(
      (projectDetail?.project.cardSections ?? []).map((s) =>
        s.key === key ? { ...s, label, description: sectionDescription } : s
      )
    )
    setEditingKey(null)
    setSectionLabel("")
    setSectionDescription("")
  }

  function handleDeleteSection(key: string) {
    persistSections(
      (projectDetail?.project.cardSections ?? []).filter((s) => s.key !== key)
    )
    setConfirmingKey(null)
  }

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
                {(projectDetail?.project.cardSections ?? []).map((s) => (
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
                    {!s.builtIn && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          data-testid={`edit-section-${s.key}`}
                          onClick={() => {
                            setEditingKey(editingKey === s.key ? null : s.key)
                            setSectionLabel(s.label)
                            setSectionDescription(s.description)
                          }}
                        >
                          Edit
                        </Button>
                        {confirmingKey === s.key ? (
                          <Button
                            size="xs"
                            variant="destructive"
                            data-testid="confirm-delete-section"
                            onClick={() => handleDeleteSection(s.key)}
                          >
                            Confirm
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            data-testid={`delete-section-${s.key}`}
                            onClick={() =>
                              setConfirmingKey(
                                confirmingKey === s.key ? null : s.key
                              )
                            }
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {addingSection || editingKey ? (
                <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-background p-4">
                  <div className="space-y-1">
                    <Label htmlFor="section-label">Label</Label>
                    <Input
                      id="section-label"
                      data-testid="section-label"
                      value={sectionLabel}
                      onChange={(e) => setSectionLabel(e.target.value)}
                      placeholder="e.g. Success metrics"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="section-description">
                      What the AI should fill in
                    </Label>
                    <Input
                      id="section-description"
                      data-testid="section-description"
                      value={sectionDescription}
                      onChange={(e) => setSectionDescription(e.target.value)}
                      placeholder="e.g. What success looks like for this requirement."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      data-testid="section-save"
                      disabled={updateProject.isPending || !sectionLabel.trim()}
                      onClick={() =>
                        editingKey
                          ? handleSaveEdit(editingKey)
                          : handleAddSection()
                      }
                    >
                      {updateProject.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddingSection(false)
                        setEditingKey(null)
                        setSectionLabel("")
                        setSectionDescription("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="add-section"
                  className="mt-4"
                  onClick={() => setAddingSection(true)}
                >
                  Add section
                </Button>
              )}
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
