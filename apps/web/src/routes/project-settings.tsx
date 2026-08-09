import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
  useProject,
  useDeleteProject,
  useUpdateProject,
  type ProjectColumn,
  type CardSectionInput,
} from "@/hooks/use-projects"
import {
  useUpdateColumns,
  useConnectColumn,
  useDisconnectColumn,
  useTrelloBoards,
  useTrelloLists,
} from "@/hooks/use-integrations"
import { camelCaseKey } from "@/lib/camel-case"
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

  function persistSections(next: CardSectionInput[]) {
    updateProject.mutate(next, {
      onError: () => toast.error("Could not save card sections"),
    })
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
        s.key === key
          ? {
              ...s,
              label,
              description: sectionDescription.trim() || s.description,
            }
          : s
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
          {section === "columns" &&
            (columns.length > 0 ? (
              <BoardColumnsSection slug={slug} columns={columns} />
            ) : (
              <section className="rounded-xl border border-border/60 bg-card p-5">
                <h2 className="text-[15px] font-semibold">Board columns</h2>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  The swimlane columns on this board.
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  No columns.
                </p>
              </section>
            ))}

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
                          disabled={updateProject.isPending}
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
                            disabled={updateProject.isPending}
                            onClick={() => handleDeleteSection(s.key)}
                          >
                            Confirm
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            data-testid={`delete-section-${s.key}`}
                            disabled={updateProject.isPending}
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

function BoardColumnsSection({
  slug,
  columns,
}: {
  slug: string | undefined
  columns: ProjectColumn[]
}) {
  const updateColumns = useUpdateColumns(slug)
  const connectColumn = useConnectColumn(slug)
  const disconnectColumn = useDisconnectColumn(slug)
  const [addingColumn, setAddingColumn] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [columnTitle, setColumnTitle] = useState("")
  const [connectKey, setConnectKey] = useState<string | null>(null)
  const [connectProvider, setConnectProvider] = useState<"github" | "trello">(
    "github"
  )
  const [connectToken, setConnectToken] = useState("")
  const [connectApiKey, setConnectApiKey] = useState("")
  const [connectTarget, setConnectTarget] = useState("")
  const [connectGithubAuth, setConnectGithubAuth] = useState<"pat" | "app">(
    "pat"
  )
  const [connectAppId, setConnectAppId] = useState("")
  const [connectInstallationId, setConnectInstallationId] = useState("")
  const [connectPrivateKey, setConnectPrivateKey] = useState("")
  const [connectBoard, setConnectBoard] = useState<string | null>(null)
  const [connectList, setConnectList] = useState<string | null>(null)
  const [trelloCreds, setTrelloCreds] = useState<{
    apiKey: string
    token: string
  } | null>(null)
  const trelloBoards = useTrelloBoards(slug, trelloCreds)
  const trelloLists = useTrelloLists(slug, trelloCreds, connectBoard)

  const boards = trelloBoards.data ?? []
  const lists = trelloLists.data ?? []

  function handleAddColumn() {
    const label = columnTitle.trim()
    if (!label) return
    let key = camelCaseKey(label)
    let n = 2
    while (columns.some((c) => c.key === key)) {
      key = `${camelCaseKey(label)}${n}`
      n += 1
    }
    updateColumns.mutate([
      ...columns,
      { key, title: label, locked: false, integration: null },
    ])
    setAddingColumn(false)
    setColumnTitle("")
  }

  function handleSaveColumnEdit(key: string) {
    const label = columnTitle.trim()
    if (!label) return
    updateColumns.mutate(
      columns.map((c) => (c.key === key ? { ...c, title: label } : c))
    )
    setEditingKey(null)
    setColumnTitle("")
  }

  function handleDeleteColumn(key: string) {
    updateColumns.mutate(columns.filter((c) => c.key !== key))
    setConfirmingKey(null)
  }

  function openConnect(key: string) {
    setConnectKey(key)
    setConnectProvider("github")
    setConnectToken("")
    setConnectApiKey("")
    setConnectTarget("")
    setConnectBoard(null)
    setConnectList(null)
    setTrelloCreds(null)
  }

  function closeConnect() {
    setConnectKey(null)
    setConnectProvider("github")
    setConnectToken("")
    setConnectApiKey("")
    setConnectTarget("")
    setConnectGithubAuth("pat")
    setConnectAppId("")
    setConnectInstallationId("")
    setConnectPrivateKey("")
    setConnectBoard(null)
    setConnectList(null)
    setTrelloCreds(null)
  }

  function handleConnectSave() {
    if (!connectKey) return
    if (connectProvider === "github") {
      if (connectGithubAuth === "pat") {
        if (!connectToken.trim() || !connectTarget.trim()) return
        connectColumn.mutate(
          {
            columnKey: connectKey,
            provider: "github",
            auth: "pat",
            config: { token: connectToken.trim() },
            target: connectTarget.trim(),
          },
          {
            onError: (e) =>
              toast.error((e as Error).message ?? "Could not connect column"),
          }
        )
      } else {
        if (
          !connectAppId.trim() ||
          !connectInstallationId.trim() ||
          !connectPrivateKey.trim() ||
          !connectTarget.trim()
        )
          return
        connectColumn.mutate(
          {
            columnKey: connectKey,
            provider: "github",
            auth: "app",
            config: {
              appId: connectAppId.trim(),
              installationId: connectInstallationId.trim(),
              privateKey: connectPrivateKey.trim(),
            },
            target: connectTarget.trim(),
          },
          {
            onError: (e) =>
              toast.error((e as Error).message ?? "Could not connect column"),
          }
        )
      }
    } else {
      if (!connectApiKey.trim() || !connectToken.trim() || !connectList) return
      const board = boards.find((b) => b.id === connectBoard)
      const list = lists.find((l) => l.id === connectList)
      connectColumn.mutate(
        {
          columnKey: connectKey,
          provider: "trello",
          config: { apiKey: connectApiKey.trim(), token: connectToken.trim() },
          target: connectList,
          boardName: board?.name,
          listName: list?.name,
        },
        { onError: () => toast.error("Could not connect column") }
      )
    }
    closeConnect()
  }

  function handleDisconnect(key: string) {
    disconnectColumn.mutate(key, {
      onError: () => toast.error("Could not disconnect column"),
    })
  }

  const connectDisabled =
    connectProvider === "github"
      ? connectGithubAuth === "pat"
        ? !connectToken.trim() || !connectTarget.trim()
        : !connectAppId.trim() ||
          !connectInstallationId.trim() ||
          !connectPrivateKey.trim() ||
          !connectTarget.trim()
      : !connectApiKey.trim() || !connectToken.trim() || !connectList

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <h2 className="text-[15px] font-semibold">Board columns</h2>
      <p className="mt-1 text-[12.5px] text-muted-foreground">
        The swimlane columns on this board. Cards in a deleted column move to
        Backlog.
      </p>
      <div className="mt-4 space-y-2">
        {columns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No columns.</p>
        ) : (
          columns.map((col) => (
            <div
              key={col.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
            >
              <span className="min-w-0 font-medium">
                {col.title}
                {col.locked && (
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase">
                    system
                  </span>
                )}
              </span>
              {!col.locked && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    data-testid={`edit-column-${col.key}`}
                    disabled={updateColumns.isPending}
                    onClick={() => {
                      setEditingKey(editingKey === col.key ? null : col.key)
                      setColumnTitle(col.title)
                    }}
                  >
                    Edit
                  </Button>
                  {confirmingKey === col.key ? (
                    <Button
                      size="xs"
                      variant="destructive"
                      data-testid="confirm-delete-column"
                      disabled={updateColumns.isPending}
                      onClick={() => handleDeleteColumn(col.key)}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      data-testid={`delete-column-${col.key}`}
                      disabled={updateColumns.isPending}
                      onClick={() =>
                        setConfirmingKey(
                          confirmingKey === col.key ? null : col.key
                        )
                      }
                    >
                      Delete
                    </Button>
                  )}
                  {col.integration ? (
                    <>
                      <span className="ml-1 text-xs text-muted-foreground">
                        Connected: {col.integration.type}
                      </span>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={disconnectColumn.isPending}
                        onClick={() => handleDisconnect(col.key)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="xs"
                      variant="outline"
                      data-testid={`connect-column-${col.key}`}
                      onClick={() => openConnect(col.key)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {(addingColumn || editingKey) && (
        <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-background p-4">
          <div className="space-y-1">
            <Label htmlFor="column-title">Title</Label>
            <Input
              id="column-title"
              data-testid="column-title"
              value={columnTitle}
              onChange={(e) => setColumnTitle(e.target.value)}
              placeholder="e.g. In progress"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid="column-save"
              disabled={updateColumns.isPending || !columnTitle.trim()}
              onClick={() =>
                editingKey
                  ? handleSaveColumnEdit(editingKey)
                  : handleAddColumn()
              }
            >
              {updateColumns.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddingColumn(false)
                setEditingKey(null)
                setColumnTitle("")
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {connectKey && (
        <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-background p-4">
          <div className="space-y-1">
            <Label htmlFor="connect-provider">Provider</Label>
            <select
              id="connect-provider"
              data-testid="connect-provider"
              value={connectProvider}
              onChange={(e) =>
                setConnectProvider(e.target.value as "github" | "trello")
              }
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="github">GitHub</option>
              <option value="trello">Trello</option>
            </select>
          </div>
          {connectProvider === "github" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="connect-github-auth">Auth method</Label>
                <select
                  id="connect-github-auth"
                  data-testid="connect-github-auth"
                  value={connectGithubAuth}
                  onChange={(e) =>
                    setConnectGithubAuth(e.target.value as "pat" | "app")
                  }
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="pat">Personal access token</option>
                  <option value="app">GitHub App</option>
                </select>
              </div>
              {connectGithubAuth === "pat" ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="connect-token">Token</Label>
                    <Input
                      id="connect-token"
                      data-testid="connect-token"
                      value={connectToken}
                      onChange={(e) => setConnectToken(e.target.value)}
                      placeholder="ghp_..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="connect-target">Repository</Label>
                    <Input
                      id="connect-target"
                      data-testid="connect-target"
                      value={connectTarget}
                      onChange={(e) => setConnectTarget(e.target.value)}
                      placeholder="org/repo"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="connect-app-id">App ID</Label>
                    <Input
                      id="connect-app-id"
                      data-testid="connect-app-id"
                      value={connectAppId}
                      onChange={(e) => setConnectAppId(e.target.value)}
                      placeholder="123456"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="connect-installation-id">
                      Installation ID
                    </Label>
                    <Input
                      id="connect-installation-id"
                      data-testid="connect-installation-id"
                      value={connectInstallationId}
                      onChange={(e) => setConnectInstallationId(e.target.value)}
                      placeholder="Installation ID from app settings"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="connect-private-key">
                      Private key (PEM)
                    </Label>
                    <textarea
                      id="connect-private-key"
                      data-testid="connect-private-key"
                      value={connectPrivateKey}
                      onChange={(e) => setConnectPrivateKey(e.target.value)}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----"
                      className="min-h-[90px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="connect-target">Repository</Label>
                    <Input
                      id="connect-target"
                      data-testid="connect-target"
                      value={connectTarget}
                      onChange={(e) => setConnectTarget(e.target.value)}
                      placeholder="org/repo"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="connect-api-key">API key</Label>
                <Input
                  id="connect-api-key"
                  data-testid="connect-api-key"
                  value={connectApiKey}
                  onChange={(e) => setConnectApiKey(e.target.value)}
                  placeholder="Trello API key"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="connect-token">Token</Label>
                <Input
                  id="connect-token"
                  data-testid="connect-token"
                  value={connectToken}
                  onChange={(e) => setConnectToken(e.target.value)}
                  placeholder="Trello token"
                />
              </div>
              {!trelloCreds && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!connectApiKey.trim() || !connectToken.trim()}
                  onClick={() =>
                    setTrelloCreds({
                      apiKey: connectApiKey.trim(),
                      token: connectToken.trim(),
                    })
                  }
                >
                  Load boards
                </Button>
              )}
              {trelloCreds && (
                <div className="space-y-1">
                  <Label htmlFor="connect-board">Board</Label>
                  <select
                    id="connect-board"
                    data-testid="connect-board"
                    value={connectBoard ?? ""}
                    onChange={(e) => {
                      setConnectBoard(e.target.value)
                      setConnectList(null)
                    }}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Pick a board</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {trelloCreds && connectBoard && (
                <div className="space-y-1">
                  <Label htmlFor="connect-list">List</Label>
                  <select
                    id="connect-list"
                    data-testid="connect-list"
                    value={connectList ?? ""}
                    onChange={(e) => setConnectList(e.target.value)}
                    className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Pick a list</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              data-testid="connect-save"
              disabled={connectDisabled || connectColumn.isPending}
              onClick={handleConnectSave}
            >
              {connectColumn.isPending ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={closeConnect}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!addingColumn && !editingKey && (
        <Button
          size="sm"
          variant="outline"
          data-testid="add-column"
          className="mt-4"
          onClick={() => setAddingColumn(true)}
        >
          Add column
        </Button>
      )}
    </section>
  )
}
