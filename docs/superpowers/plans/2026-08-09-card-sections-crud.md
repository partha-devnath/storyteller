# Custom Card Sections CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add, edit, and delete custom card sections from the board settings UI, persisted via a new `PATCH /api/projects/:slug` endpoint.

**Architecture:** Validation lives in a zod schema (`updateCardSectionsSchema`, `packages/schemas`) covering shape + invariants (built-ins locked and first, unique camelCase keys). A thin API route validates and replaces `project.cardSections`. The web settings tab edits a local list and persists the full array per action via a new `useUpdateProject` hook. AI prompts already consume cardSections — untouched.

**Tech Stack:** Hono, Drizzle ORM, zod, React 19, TanStack React Query, Vitest + Testing Library (web), bun:test (api).

## Global Constraints

- Named exports only — no default exports
- No comments in code unless asked
- Conventional Commits; run `bun run typecheck` + `bun run lint` before committing
- Tests in `__tests__/` next to source; web tests via `bun run test` (root vitest, jsdom), api tests via `bun test` in `apps/api`
- Types must be erasable (`erasableSyntaxOnly`) — no enums
- Server-side validation only in `@workspace/schemas` zod schemas (route handlers stay thin)
- `DEFAULT_CARD_SECTIONS` (2 entries) and `CardSection` type already exported from `@workspace/schemas` (via `./db/project`)

---

### Task 1: `updateCardSectionsSchema` + unit tests

**Files:**

- Modify: `packages/schemas/src/validations/project.ts`
- Modify: `packages/schemas/src/__tests__/validations.test.ts`

**Interfaces:**

- Consumes: `DEFAULT_CARD_SECTIONS` from `../db/project` (already exported)
- Produces: `updateCardSectionsSchema: z.ZodObject<{ cardSections: ... }>` — Task 2 imports it into the API route; Task 3's web hook sends a body matching its shape.

- [ ] **Step 1: Write the failing tests**

Append to `packages/schemas/src/__tests__/validations.test.ts`:

```ts
import { updateCardSectionsSchema } from "../validations/project"
import { DEFAULT_CARD_SECTIONS } from "../db/project"

describe("card section validations", () => {
  const custom = {
    key: "teamSize",
    label: "Team size",
    description: "How many people this requirement affects.",
    builtIn: false,
  }

  function base(sections: unknown[]) {
    return { cardSections: sections }
  }

  it("accepts built-ins plus custom sections", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, custom])
    )
    expect(result.success).toBe(true)
  })

  it("rejects missing built-ins", () => {
    const result = updateCardSectionsSchema.safeParse(base([custom]))
    expect(result.success).toBe(false)
  })

  it("rejects built-ins that are not first", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([custom, ...DEFAULT_CARD_SECTIONS])
    )
    expect(result.success).toBe(false)
  })

  it("rejects a changed built-in entry", () => {
    const tampered = { ...DEFAULT_CARD_SECTIONS[0], label: "Summary" }
    const result = updateCardSectionsSchema.safeParse(
      base([tampered, DEFAULT_CARD_SECTIONS[1]])
    )
    expect(result.success).toBe(false)
  })

  it("rejects a custom section flagged built-in", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, { ...custom, builtIn: true }])
    )
    expect(result.success).toBe(false)
  })

  it("rejects duplicate keys", () => {
    const dup = { ...custom, label: "Team size again" }
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, custom, dup])
    )
    expect(result.success).toBe(false)
  })

  it("rejects non-camelCase keys", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, { ...custom, key: "TeamSize" }])
    )
    expect(result.success).toBe(false)
  })

  it("rejects a label longer than 60 characters", () => {
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, { ...custom, label: "x".repeat(61) }])
    )
    expect(result.success).toBe(false)
  })

  it("rejects more than 20 sections", () => {
    const many = Array.from({ length: 19 }, (_, i) => ({
      key: `custom${i + 1}`,
      label: `Custom ${i + 1}`,
      description: "d",
      builtIn: false,
    }))
    const result = updateCardSectionsSchema.safeParse(
      base([...DEFAULT_CARD_SECTIONS, ...many])
    )
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test validations`
Expected: FAIL — `updateCardSectionsSchema` is not exported.

- [ ] **Step 3: Implement the schema**

Append to `packages/schemas/src/validations/project.ts`:

```ts
import { DEFAULT_CARD_SECTIONS } from "../db/project"

export const cardSectionSchema = z.object({
  key: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "Section key must be camelCase"),
  label: z
    .string()
    .min(1, "Section label is required")
    .max(60, "Section label must be at most 60 characters"),
  description: z
    .string()
    .min(1, "Section description is required")
    .max(300, "Section description must be at most 300 characters"),
  builtIn: z.boolean(),
})

export const updateCardSectionsSchema = z.object({
  cardSections: z
    .array(cardSectionSchema)
    .max(20, "At most 20 card sections are allowed")
    .superRefine((sections, ctx) => {
      const seen = new Set<string>()
      for (const [i, s] of sections.entries()) {
        if (seen.has(s.key)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "key"],
            message: `Duplicate section key: ${s.key}`,
          })
        }
        seen.add(s.key)
        if (s.builtIn && !DEFAULT_CARD_SECTIONS.some((d) => d.key === s.key)) {
          ctx.addIssue({
            code: "custom",
            path: [i, "builtIn"],
            message: `Unknown built-in section key: ${s.key}`,
          })
        }
      }
      for (const [i, d] of DEFAULT_CARD_SECTIONS.entries()) {
        const actual = sections[i]
        if (
          !actual ||
          actual.key !== d.key ||
          actual.label !== d.label ||
          actual.description !== d.description ||
          actual.builtIn !== d.builtIn
        ) {
          ctx.addIssue({
            code: "custom",
            path: [i],
            message: `Built-in section "${d.key}" must be present unchanged at position ${i}`,
          })
        }
      }
    }),
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test validations`
Expected: PASS (9 new tests).

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/validations/project.ts packages/schemas/src/__tests__/validations.test.ts
git commit -m "feat(schemas): validate custom card sections updates"
```

---

### Task 2: `PATCH /api/projects/:slug` route + 401 test

**Files:**

- Modify: `apps/api/src/routes/projects.ts`
- Create: `apps/api/src/__tests__/card-sections.test.ts`

**Interfaces:**

- Consumes: `updateCardSectionsSchema` from `@workspace/schemas` (Task 1); `validateBody`, `requireRole`, `resolveOrgFromProject` (already used in projects.ts)
- Produces: `PATCH /api/projects/:slug` accepting `{ cardSections }` and returning `{ success: true, data: { project } }` — Task 3's hook calls it.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/__tests__/card-sections.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "bun:test"

beforeAll(() => {
  process.env.DATABASE_URL =
    "postgres://template:template@localhost:5432/template"
  process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long!!"
  process.env.BETTER_AUTH_URL = "http://localhost:3001/api/auth"
  process.env.CLIENT_URL = "http://localhost:5173"
  process.env.AI_PROVIDER = "mock"
})

describe("card sections routes", () => {
  it("PATCH /api/projects/:slug returns 401 without session", async () => {
    const { default: app } = await import("../app")
    const res = await app.fetch(
      new Request("http://localhost/api/projects/acme", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardSections: [] }),
      })
    )
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test` in `apps/api` (workdir `apps/api`)
Expected: FAIL — 404 (route does not exist yet; the `:slug` GET matches nothing for PATCH).

- [ ] **Step 3: Implement the route**

In `apps/api/src/routes/projects.ts`:

1. Add `cardSectionSchema`/`updateCardSectionsSchema` to the `@workspace/schemas` import (line 12 area):

```ts
import {
  createProjectSchema,
  updateCardSectionsSchema,
} from "@workspace/schemas/validations/project"
```

(Keep the existing `createProjectSchema` import line; add the new import next to it.)

2. Add the route between the `/:slug/proposed` GET (ends line 198) and the DELETE route (line 203):

```ts
// Replace the board's custom card sections. Built-ins are locked and
// validated by updateCardSectionsSchema; the full list is stored as-is.
projectsRoutes.patch(
  "/:slug",
  resolveOrgFromProject,
  requireRole("owner", "admin", "member"),
  validateBody(updateCardSectionsSchema),
  async (c) => {
    const projectId = c.var.projectId!
    const body = c.var.body as {
      cardSections: typeof project.$inferSelect.cardSections
    }
    const [updated] = await db
      .update(project)
      .set({ cardSections: body.cardSections, updatedAt: new Date() })
      .where(eq(project.id, projectId))
      .returning()
    if (!updated) {
      throw httpError("Not Found", 404)
    }
    return c.json({ success: true, data: { project: updated } })
  }
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test` in `apps/api` (workdir `apps/api`)
Expected: PASS (401).

- [ ] **Step 5: Verify + commit**

Run: `bun run typecheck` and `bun run lint`
Expected: no errors.

```bash
git add apps/api/src/routes/projects.ts apps/api/src/__tests__/card-sections.test.ts
git commit -m "feat(api): update card sections endpoint"
```

---

### Task 3: `useUpdateProject` hook + settings UI + component tests

**Files:**

- Modify: `apps/web/src/hooks/use-projects.ts`
- Modify: `apps/web/src/routes/project-settings.tsx`
- Create: `apps/web/src/routes/__tests__/project-settings.test.tsx`

**Interfaces:**

- Consumes: `PATCH /api/projects/:slug` (Task 2); `useProject` (exists, `["project", slug]` query); `apiClient` from `@/lib/api-client`
- Produces: `useUpdateProject(slug: string | undefined)` hook; settings "Card sections" tab with add/edit/delete

- [ ] **Step 1: Add the hook**

In `apps/web/src/hooks/use-projects.ts`:

1. Add a type near `ProjectDetail` (line 20):

```ts
export type CardSectionInput = {
  key: string
  label: string
  description: string
  builtIn: boolean
}
```

2. Change the inline `cardSections` type in `ProjectDetail` (lines 28-33) to use it:

```ts
cardSections?: CardSectionInput[]
```

3. Add the hook after `useDeleteProject`:

```ts
export function useUpdateProject(slug: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cardSections: CardSectionInput[]) => {
      const res = await apiClient<
        Envelope<{ project: { cardSections: CardSectionInput[] } }>
      >(`/api/projects/${slug}`, { method: "PATCH", body: { cardSections } })
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", slug] }),
  })
}
```

- [ ] **Step 2: Write the failing component tests**

Create `apps/web/src/routes/__tests__/project-settings.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { DEFAULT_CARD_SECTIONS } from "@workspace/schemas"

const { updateMutate } = vi.hoisted(() => ({ updateMutate: vi.fn() }))

vi.mock("@/hooks/use-projects", () => ({
  useProject: () => ({
    data: {
      project: {
        id: "p1",
        name: "Loyalty",
        slug: "loyalty",
        description: null,
        orgId: "org1",
        columns: [],
        cardSections: [
          ...DEFAULT_CARD_SECTIONS,
          {
            key: "teamSize",
            label: "Team size",
            description: "People affected.",
            builtIn: false,
          },
        ],
      },
      epics: [],
      cards: [],
    },
  }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: updateMutate, isPending: false }),
}))

describe("ProjectSettingsPage card sections", () => {
  async function renderSettings() {
    const { ProjectSettingsPage } = await import("../project-settings")
    return render(
      <MemoryRouter>
        <ProjectSettingsPage />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    updateMutate.mockClear()
  })

  it("renders built-ins locked without edit/delete buttons", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    expect(screen.getAllByText("built-in")).toHaveLength(2)
    expect(screen.getByText("Team size")).toBeInTheDocument()
  })

  it("adds a section with an auto-generated camelCase key", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    fireEvent.click(screen.getByTestId("add-section"))
    fireEvent.change(screen.getByTestId("section-label"), {
      target: { value: "Success metrics" },
    })
    fireEvent.change(screen.getByTestId("section-description"), {
      target: { value: "What success looks like." },
    })
    fireEvent.click(screen.getByTestId("section-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      ...DEFAULT_CARD_SECTIONS,
      {
        key: "teamSize",
        label: "Team size",
        description: "People affected.",
        builtIn: false,
      },
      {
        key: "successMetrics",
        label: "Success metrics",
        description: "What success looks like.",
        builtIn: false,
      },
    ])
  })

  it("edits a custom section label", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    fireEvent.click(screen.getByTestId("edit-section-teamSize"))
    fireEvent.change(screen.getByTestId("section-label"), {
      target: { value: "Team size (FTE)" },
    })
    fireEvent.click(screen.getByTestId("section-save"))
    expect(updateMutate).toHaveBeenCalledWith([
      ...DEFAULT_CARD_SECTIONS,
      {
        key: "teamSize",
        label: "Team size (FTE)",
        description: "People affected.",
        builtIn: false,
      },
    ])
  })

  it("deletes a custom section after confirming", async () => {
    await renderSettings()
    fireEvent.click(screen.getByRole("button", { name: "Card sections" }))
    fireEvent.click(screen.getByTestId("delete-section-teamSize"))
    fireEvent.click(screen.getByTestId("confirm-delete-section"))
    expect(updateMutate).toHaveBeenCalledWith([...DEFAULT_CARD_SECTIONS])
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun run test project-settings`
Expected: FAIL — testids/mutations missing.

- [ ] **Step 4: Implement the settings UI**

In `apps/web/src/routes/project-settings.tsx`:

1. Add imports:

```tsx
import { useUpdateProject, type CardSectionInput } from "@/hooks/use-projects"
```

2. Add state next to the existing state (line 25-26):

```tsx
const updateProject = useUpdateProject(slug)
const [addingSection, setAddingSection] = useState(false)
const [editingKey, setEditingKey] = useState<string | null>(null)
const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
const [sectionLabel, setSectionLabel] = useState("")
const [sectionDescription, setSectionDescription] = useState("")
```

3. Add helpers before `handleDelete`:

```tsx
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
```

4. Replace the `sections` tab body (lines 114-149) with the editable list:

```tsx
{
  section === "sections" && (
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
                      setConfirmingKey(confirmingKey === s.key ? null : s.key)
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
                editingKey ? handleSaveEdit(editingKey) : handleAddSection()
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
  )
}
```

Note: the UI derives sections directly from `projectDetail?.project.cardSections` — no local copy of the list.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test project-settings`
Expected: PASS (4 tests).

- [ ] **Step 6: Verify + commit**

Run: `bun run typecheck` and `bun run lint`
Expected: no errors.

```bash
git add apps/web/src/hooks/use-projects.ts apps/web/src/routes/project-settings.tsx apps/web/src/routes/__tests__/project-settings.test.tsx
git commit -m "feat(web): manage custom card sections in board settings"
```

---

## Post-Plan Verification

- [ ] `bun run test` passes (root vitest — includes schema + web tests)
- [ ] `bun test` passes in `apps/api`
- [ ] `bun run typecheck` and `bun run lint` pass
- [ ] Manual: settings → Card sections → add/edit/delete a section; AI instruction regenerates a proposal using the new section
