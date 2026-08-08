import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useCreateCard } from "@/hooks/use-cards"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "@/stores/toast-store"

const STATUSES = [
  { key: "backlog", title: "Backlog" },
  { key: "todo", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "review", title: "Review" },
  { key: "done", title: "Done" },
]

const PRIORITIES = ["low", "medium", "high", "critical"]

export function CreateCardForm({ projectSlug }: { projectSlug: string }) {
  const queryClient = useQueryClient()
  const createCard = useCreateCard(projectSlug)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("backlog")
  const [priority, setPriority] = useState("medium")
  const [criteria, setCriteria] = useState("")

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    try {
      await createCard.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        acceptanceCriteria: criteria
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean),
      })
      setTitle("")
      setDescription("")
      setCriteria("")
      toast.success("Card created")
      queryClient.invalidateQueries({ queryKey: ["project", projectSlug] })
    } catch (e) {
      toast.error((e as Error).message ?? "Could not create card")
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="card-title">Title</Label>
        <Input
          id="card-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Users can reset their password"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="card-description">Description</Label>
        <textarea
          id="card-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What the requirement does and why it matters…"
          className="min-h-[90px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="card-criteria">
          Acceptance criteria{" "}
          <span className="text-muted-foreground">(one per line)</span>
        </Label>
        <textarea
          id="card-criteria"
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          placeholder={
            "User can request a reset link\nReset link expires after 30 minutes"
          }
          className="min-h-[70px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      <Button
        onClick={handleCreate}
        disabled={createCard.isPending}
        data-testid="settings-create-card"
      >
        {createCard.isPending ? "Creating..." : "Create card"}
      </Button>
    </div>
  )
}
