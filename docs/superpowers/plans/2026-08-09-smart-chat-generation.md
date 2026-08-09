# Smart Chat Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The chat AI decides create / update / skip per requested card using semantic matches, in all flows. New chat-created cards always carry every configured card section. Chat replies summarize created/updated/skipped counts.

**Architecture:** The AI output schema gains `action`/`targetCardId`/`conflictFlags` per story; prompts gain a "Similar existing cards" section; a pure `story-mapping.ts` service converts stories → proposal changes (create/update/skip) with section completion and target validation; the API routes feed semantic context into all flows and return a reply summary the web renders.

**Tech Stack:** zod, packages/ai (prompts/operations), Hono routes, React Query, Vitest, bun:test.

## Global Constraints

- Named exports only — no default exports
- No comments in code unless asked
- Conventional Commits; run `bun run typecheck` + `bun run lint` before committing
- Tests in `__tests__/` next to source; web via root vitest, api via `bun test` in `apps/api`
- Types must be erasable (no enums)
- `buildSemanticContext` already exists in `apps/api/src/services/board-snapshot.ts` (embeds + top-6 matches); `SemanticMatch` type in `packages/ai/src/types.ts`

---

### Task 1: AI output schema + types

**Files:**

- Modify: `packages/ai/src/schemas.ts` (story schema)
- Modify: `packages/ai/src/types.ts` (`EpicDraft.stories`)
- Modify: `packages/ai/src/__tests__/schemas.test.ts`

**Interfaces:**

- Consumes: `generateBoardOutputSchema` (existing)
- Produces: story schema accepting `action?: "create"|"update"|"skip"`, `targetCardId?: string`, `conflictFlags?: { type, summary }[]`, `relationSummary?: { type, sourceCardId?, targetCardId?, note }[]` (relation hints for updates — spec section 6); `EpicDraft.stories[i]` carries the same optional fields — Tasks 2-4 consume these

- [ ] **Step 1: Write the failing schema tests**

Append to `packages/ai/src/__tests__/schemas.test.ts`:

```ts
describe("generateBoardOutputSchema story actions", () => {
  const baseStory = {
    title: "Enroll",
    description: "d",
    acceptanceCriteria: [],
    priority: "medium",
    suggestedStatus: "backlog",
  }

  function boardWith(story: Record<string, unknown>) {
    return {
      kind: "board",
      epics: [
        {
          name: "E",
          description: "d",
          order: 0,
          stories: [story],
        },
      ],
    }
  }

  it("accepts a create story without action fields", () => {
    const result = generateBoardOutputSchema.safeParse(boardWith(baseStory))
    expect(result.success).toBe(true)
  })

  it("accepts an update story with targetCardId", () => {
    const result = generateBoardOutputSchema.safeParse(
      boardWith({
        ...baseStory,
        action: "update",
        targetCardId: "card_1",
        conflictFlags: [{ type: "duplicate", summary: "overlaps" }],
        relationSummary: [
          {
            type: "evolution",
            targetCardId: "card_9",
            note: "replaces closed card",
          },
        ],
      })
    )
    expect(result.success).toBe(true)
  })

  it("accepts a skip story with duplicate flag", () => {
    const result = generateBoardOutputSchema.safeParse(
      boardWith({
        ...baseStory,
        action: "skip",
        conflictFlags: [{ type: "duplicate", summary: "already exists" }],
      })
    )
    expect(result.success).toBe(true)
  })

  it("rejects an invalid action value", () => {
    const result = generateBoardOutputSchema.safeParse(
      boardWith({ ...baseStory, action: "delete" })
    )
    expect(result.success).toBe(false)
  })

  it("rejects an invalid conflict flag type", () => {
    const result = generateBoardOutputSchema.safeParse(
      boardWith({
        ...baseStory,
        action: "skip",
        conflictFlags: [{ type: "weird", summary: "x" }],
      })
    )
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test schemas` (from repo root)
Expected: FAIL — action/conflictFlags rejected by strict schema.

- [ ] **Step 3: Implement schema + type changes**

In `packages/ai/src/schemas.ts`, the story object (inside the epics array, ~line 60-68) gains:

```ts
action: z.enum(["create", "update", "skip"]).optional(),
targetCardId: z.string().optional(),
conflictFlags: z
  .array(
    z
      .object({
        type: z.enum(["contradiction", "duplicate", "conflict"]),
        summary: z.string(),
      })
      .strict()
  )
  .optional(),
```

The story object already has `.strict()` — the new fields must be added INSIDE it (before `.strict()`). The `relationSummary` field:

```ts
relationSummary: z
  .array(
    z
      .object({
        type: z.enum(["dependency", "hierarchy", "evolution"]),
        sourceCardId: z.string().optional(),
        targetCardId: z.string().optional(),
        note: z.string(),
      })
      .strict()
  )
  .optional(),
```

In `packages/ai/src/types.ts`, `EpicDraft.stories[i]` (the inline object at ~line 122) gains:

```ts
action?: "create" | "update" | "skip"
targetCardId?: string
conflictFlags?: { type: "contradiction" | "duplicate" | "conflict"; summary: string }[]
relationSummary?: {
  type: "dependency" | "hierarchy" | "evolution"
  sourceCardId?: string
  targetCardId?: string
  note: string
}[]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test schemas`
Expected: PASS (5 new tests).

- [ ] **Step 5: Verify + commit**

Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add packages/ai/src/schemas.ts packages/ai/src/types.ts packages/ai/src/__tests__/schemas.test.ts
git commit -m "feat(ai): story actions for create, update, and skip"
```

---

### Task 2: Prompts — semantic matches + action instructions

**Files:**

- Modify: `packages/ai/src/prompts/generate-board.ts`
- Modify: `packages/ai/src/prompts/clarifying-questions.ts`
- Modify: `packages/ai/src/__tests__/prompts.test.ts`

**Interfaces:**

- Consumes: `SemanticMatch` from `../types` (exists: `{ cardId, title, slug, isClosed, similarity }`)
- Produces: both prompt builders accept `semanticMatches?: SemanticMatch[]`; system content documents `action`/`targetCardId`/`conflictFlags` and instructs create/update/skip — Task 3's operations pass matches through

- [ ] **Step 1: Write the failing prompt tests**

Append to `packages/ai/src/__tests__/prompts.test.ts` (check existing imports; add `buildGenerateBoardPrompt` if not present):

```ts
describe("generate-board prompt semantic matches", () => {
  it("includes similar existing cards in the user message", () => {
    const { buildGenerateBoardPrompt } =
      await import("../prompts/generate-board")
    const messages = buildGenerateBoardPrompt({
      prompt: "Add referral",
      existingContext: "{}",
      semanticMatches: [
        {
          cardId: "card_1",
          title: "Referral program",
          slug: "referral-program",
          isClosed: false,
          similarity: 0.92,
        },
      ],
    })
    const userContent = messages[1].content as string
    expect(userContent).toContain("Referral program")
    expect(userContent).toContain("0.92")
  })

  it("documents the action field in the system prompt", () => {
    const { buildGenerateBoardPrompt } =
      await import("../prompts/generate-board")
    const messages = buildGenerateBoardPrompt({ prompt: "x" })
    expect(messages[0].content).toContain('"action":"create|update|skip"')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun run test prompts`
Expected: FAIL — semanticMatches param missing / action not documented.

- [ ] **Step 3: Implement**

In `packages/ai/src/prompts/generate-board.ts`:

1. Import `SemanticMatch` type; add param:

```ts
export function buildGenerateBoardPrompt({
  prompt,
  existingContext,
  cardSections = [],
  semanticMatches = [],
}: {
  prompt: string
  existingContext?: string
  cardSections?: CardSectionDef[]
  semanticMatches?: SemanticMatch[]
}): ChatMessage[] {
```

2. Build a matches hint (before the `sectionsHint`):

```ts
const matchesHint =
  semanticMatches.length > 0
    ? `\nExisting cards that may match this request (decide create/update/skip against these):\n${semanticMatches
        .map(
          (m) =>
            `- ${m.title} (id: ${m.cardId}, similarity: ${m.similarity.toFixed(2)}, status: ${m.isClosed ? "closed" : "open"})`
        )
        .join("\n")}`
    : ""
```

3. Extend the schema line in system content (`"sections"?:{string:string}}]}]}` becomes):

```ts
'"sections"?:{string:string},' +
'"action"?:"create|update|skip","targetCardId"?:string,' +
'"conflictFlags"?:[{type:"contradiction|duplicate|conflict",summary:string}]}]}]}\n' +
```

4. Add the instruction paragraph after the "No markdown fences" line:

```ts
"Decide per story: create a new card (no existing match), update an existing card " +
"(matching card needs changes — set action=update, targetCardId, and only the changed fields), " +
"or skip (matching card already covers the request — set action=skip with a conflictFlags duplicate entry). " +
"Never create a duplicate of an existing card." +
```

5. Append `matchesHint` to the user content (after existingContext block):

```ts
      content: existingContext
        ? `Existing board context:\n${existingContext}\n${matchesHint}\n\nPrompt:\n${prompt}`
        : `${matchesHint}\n\n${prompt}`,
```

Mirror the same param + matchesHint + instruction changes in `packages/ai/src/prompts/clarifying-questions.ts` (read the file first; it builds a similar system/user pair).

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test prompts`
Expected: PASS (2 new tests).

- [ ] **Step 5: Verify + commit**

Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add packages/ai/src/prompts/generate-board.ts packages/ai/src/prompts/clarifying-questions.ts packages/ai/src/__tests__/prompts.test.ts
git commit -m "feat(ai): semantic matches and create/update/skip instructions in prompts"
```

---

### Task 3: Operations pass semantic matches through

**Files:**

- Modify: `packages/ai/src/operations/generate-board.ts`
- Modify: `packages/ai/src/operations/clarify.ts`
- Modify: `packages/ai/src/operations/process-instruction.ts` (only if it needs a shared helper — check first; it already passes semanticMatches to its prompt)
- Modify: `packages/ai/src/__tests__/operations.test.ts`

**Interfaces:**

- Consumes: prompt builders (Task 2)
- Produces: `generateBoard({ ..., semanticMatches? })` and `answerClarifyingQuestions({ ..., semanticMatches? })` forward matches into prompts; story mapping in `EpicDraft` preserves action/targetCardId/conflictFlags (Task 1 type) — Task 4 consumes

- [ ] **Step 1: Write the failing operation test**

Append to `packages/ai/src/__tests__/operations.test.ts`:

```ts
it("preserves story actions when mapping provider output", async () => {
  const { generateBoard } = await import("../operations/generate-board")
  const provider = {
    async chat() {
      return JSON.stringify({
        kind: "board",
        epics: [
          {
            name: "E",
            description: "d",
            order: 0,
            stories: [
              {
                title: "Enroll",
                description: "d",
                acceptanceCriteria: [],
                priority: "medium",
                suggestedStatus: "backlog",
              },
              {
                title: "Referral program",
                description: "d",
                acceptanceCriteria: [],
                priority: "high",
                suggestedStatus: "review",
                action: "update",
                targetCardId: "card_1",
                conflictFlags: [{ type: "duplicate", summary: "overlaps" }],
              },
            ],
          },
        ],
      })
    },
    async embed() {
      return []
    },
  }
  const result = await generateBoard({
    provider,
    prompt: "x",
    semanticMatches: [
      {
        cardId: "card_1",
        title: "Referral program",
        slug: "referral-program",
        isClosed: false,
        similarity: 0.91,
      },
    ],
  })
  expect(result.kind).toBe("board")
  if (result.kind === "board") {
    const update = result.epics[0].stories[1]
    expect(update.action).toBe("update")
    expect(update.targetCardId).toBe("card_1")
    expect(update.conflictFlags?.[0].type).toBe("duplicate")
  }
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun run test operations`
Expected: FAIL — story mapping drops the new fields.

- [ ] **Step 3: Implement**

In `packages/ai/src/operations/generate-board.ts`:

1. Add `semanticMatches` param + type import:

```ts
import type {
  LLMProvider,
  BoardSnapshot,
  GenerateBoardResult,
  CardSectionDef,
  SemanticMatch,
} from "../types"
```

```ts
export async function generateBoard({
  provider,
  prompt,
  snapshot,
  cardSections = [],
  semanticMatches = [],
}: {
  provider: LLMProvider
  prompt: string
  snapshot?: BoardSnapshot
  cardSections?: CardSectionDef[]
  semanticMatches?: SemanticMatch[]
}): Promise<GenerateBoardResult> {
```

2. Pass into the prompt builder:

```ts
const messages = buildGenerateBoardPrompt({
  prompt,
  existingContext: snapshot ? JSON.stringify(snapshot) : undefined,
  cardSections,
  semanticMatches,
})
```

3. Preserve the new fields in the story mapping (the `stories: epic.stories.map(...)` block):

```ts
      stories: epic.stories.map((story) => ({
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        priority: story.priority,
        suggestedStatus: story.suggestedStatus,
        sections: story.sections,
        action: story.action,
        targetCardId: story.targetCardId,
        conflictFlags: story.conflictFlags,
        relationSummary: story.relationSummary,
      })),
```

Mirror the same changes in `packages/ai/src/operations/clarify.ts` (param, prompt call, story mapping).

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test operations`
Expected: PASS (new test).

- [ ] **Step 5: Verify + commit**

Run: `bun run typecheck` + `bun run lint` — clean.

```bash
git add packages/ai/src/operations/generate-board.ts packages/ai/src/operations/clarify.ts packages/ai/src/__tests__/operations.test.ts
git commit -m "feat(ai): forward semantic matches into generation operations"
```

---

### Task 4: Story mapping service + API routes

**Files:**

- Create: `apps/api/src/services/story-mapping.ts`
- Create: `apps/api/src/__tests__/story-mapping.test.ts`
- Modify: `apps/api/src/routes/ai.ts` (`/generate` + `/clarify`)

**Interfaces:**

- Consumes: `buildSemanticContext` (board-snapshot.ts), `EpicDraft` type, `project.cardSections`
- Produces:
  - `mapStoriesToChanges({ epics, cardSections, knownCardIds }) → { changes: StoryChange[], skipped: { title, reason }[] }` where `StoryChange = { changeType: "create", newData, epicName? } | { changeType: "update", targetCardId, newData }` and `newData = { title, description, acceptanceCriteria, status, priority, sections }`
  - `buildProposalSummary(created, updated, skipped) → { created, updated, skipped }`
  - routes return `{ kind: "board", proposal, summary }`
  - `buildReplySummaryText(summary) → string` — Task 5 imports this

- [ ] **Step 1: Write the failing unit tests**

Create `apps/api/src/__tests__/story-mapping.test.ts`:

```ts
import { describe, it, expect } from "bun:test"
import {
  mapStoriesToChanges,
  buildReplySummaryText,
} from "../services/story-mapping"

const cardSections = [
  { key: "description", label: "Description", description: "", builtIn: true },
  {
    key: "valueAddition",
    label: "Value addition",
    description: "",
    builtIn: false,
  },
]

const epics = [
  {
    name: "Loyalty",
    description: "d",
    order: 0,
    stories: [
      {
        title: "Enroll",
        description: "d",
        acceptanceCriteria: ["c1"],
        priority: "medium" as const,
        suggestedStatus: "backlog" as const,
      },
      {
        title: "Referral program",
        description: "v2",
        acceptanceCriteria: ["c2"],
        priority: "high" as const,
        suggestedStatus: "review" as const,
        action: "update" as const,
        targetCardId: "card_1",
        sections: { valueAddition: "lift" },
        relationSummary: [
          {
            type: "evolution" as const,
            targetCardId: "card_9",
            note: "replaces closed card",
          },
        ],
      },
      {
        title: "Duplicate thing",
        description: "d",
        acceptanceCriteria: [],
        priority: "low" as const,
        suggestedStatus: "backlog" as const,
        action: "skip" as const,
        conflictFlags: [
          { type: "duplicate" as const, summary: "already exists" },
        ],
      },
      {
        title: "Ghost update",
        description: "d",
        acceptanceCriteria: [],
        priority: "low" as const,
        suggestedStatus: "backlog" as const,
        action: "update" as const,
        targetCardId: "card_missing",
      },
    ],
  },
]

describe("mapStoriesToChanges", () => {
  it("maps create, update, and skip stories", () => {
    const { changes, skipped } = mapStoriesToChanges({
      epics,
      cardSections,
      knownCardIds: new Set(["card_1"]),
    })

    expect(changes).toHaveLength(2)
    expect(changes[0]).toMatchObject({
      changeType: "create",
      newData: { title: "Enroll", epicName: "Loyalty" },
    })
    expect(changes[1]).toMatchObject({
      changeType: "update",
      targetCardId: "card_1",
      newData: { title: "Referral program" },
      relationSummary: [
        {
          type: "evolution",
          targetCardId: "card_9",
          note: "replaces closed card",
        },
      ],
    })
    expect(skipped).toHaveLength(2)
    expect(skipped[0]).toMatchObject({
      title: "Duplicate thing",
      reason: "already exists",
    })
    expect(skipped[1]).toMatchObject({ title: "Ghost update" })
  })

  it("completes missing sections with empty strings on create", () => {
    const { changes } = mapStoriesToChanges({
      epics,
      cardSections,
      knownCardIds: new Set(["card_1"]),
    })
    const create = changes[0]
    expect(create.newData.sections).toEqual({
      description: "",
      valueAddition: "",
    })
  })

  it("does not complete sections on update changes", () => {
    const { changes } = mapStoriesToChanges({
      epics,
      cardSections,
      knownCardIds: new Set(["card_1"]),
    })
    const update = changes[1]
    expect(update.newData.sections).toEqual({ valueAddition: "lift" })
  })
})

describe("buildReplySummaryText", () => {
  it("renders the summary line", () => {
    const text = buildReplySummaryText({
      created: 6,
      updated: 1,
      skipped: [{ title: "Loyalty enrollment", reason: "already exists" }],
    })
    expect(text).toContain("Generated 7 cards: 6 new, 1 update, 1 skipped.")
    expect(text).toContain('"Loyalty enrollment" already exists')
  })

  it("renders a no-skip summary", () => {
    const text = buildReplySummaryText({ created: 2, updated: 0, skipped: [] })
    expect(text).toContain("Generated 2 cards: 2 new.")
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `bun test src/__tests__/story-mapping.test.ts` in apps/api
Expected: FAIL — module missing.

- [ ] **Step 3: Implement story-mapping.ts**

```ts
import type { EpicDraft } from "@workspace/ai"

export type StoryChange = {
  changeType: "create" | "update"
  targetCardId?: string
  newData: {
    title: string
    description: string
    acceptanceCriteria: string[]
    status: string
    priority: string
    sections?: Record<string, string>
  }
  epicName?: string
  relationSummary?: {
    type: "dependency" | "hierarchy" | "evolution"
    sourceCardId?: string
    targetCardId?: string
    note: string
  }[]
  conflictFlags?: {
    type: "contradiction" | "duplicate" | "conflict"
    summary: string
  }[]
}

export type ProposalSummary = {
  created: number
  updated: number
  skipped: { title: string; reason: string }[]
}

export function mapStoriesToChanges({
  epics,
  cardSections,
  knownCardIds,
}: {
  epics: EpicDraft[]
  cardSections: { key: string }[]
  knownCardIds: Set<string>
}): { changes: StoryChange[]; skipped: { title: string; reason: string }[] } {
  const changes: StoryChange[] = []
  const skipped: { title: string; reason: string }[] = []

  for (const epic of epics) {
    for (const story of epic.stories) {
      const action = story.action ?? "create"
      const newData = {
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        status: story.suggestedStatus,
        priority: story.priority,
      }

      if (action === "skip") {
        skipped.push({
          title: story.title,
          reason:
            story.conflictFlags?.map((f) => f.summary).join("; ") ??
            "already exists",
        })
        continue
      }

      if (action === "update") {
        if (!story.targetCardId || !knownCardIds.has(story.targetCardId)) {
          skipped.push({
            title: story.title,
            reason: "target card was not found on the board",
          })
          continue
        }
        changes.push({
          changeType: "update",
          targetCardId: story.targetCardId,
          newData: {
            ...newData,
            sections: story.sections,
          },
          relationSummary: story.relationSummary,
          conflictFlags: story.conflictFlags,
        })
        continue
      }

      const sections: Record<string, string> = { ...(story.sections ?? {}) }
      for (const section of cardSections) {
        if (!(section.key in sections)) sections[section.key] = ""
      }
      changes.push({
        changeType: "create",
        epicName: epic.name,
        newData: {
          ...newData,
          sections,
        },
      })
    }
  }

  return { changes, skipped }
}

export function buildReplySummaryText(summary: ProposalSummary): string {
  const total = summary.created + summary.updated
  const counts = `${summary.created} new${
    summary.updated > 0 ? `, ${summary.updated} update` : ""
  }`
  const base = `Generated ${total} cards: ${counts}${
    summary.skipped.length > 0 ? `, ${summary.skipped.length} skipped.` : "."
  }`
  if (summary.skipped.length === 0) return base
  const details = summary.skipped
    .map((s) => `Skipped: "${s.title}" — ${s.reason}`)
    .join("\n")
  return `${base}\n${details}`
}
```

NOTE: `EpicDraft` is exported from `@workspace/ai`? Check `packages/ai/src/index.ts` — if not exported, export it in Task 3 or import the shape via `GenerateBoardResult`'s epics type. Verify before committing.

- [ ] **Step 4: Wire the routes**

In `apps/api/src/routes/ai.ts`:

1. `/generate` — after building the snapshot (line ~127), add semantic context:

```ts
const snapshot = await buildBoardSnapshot(projectId)
const semantic = await buildSemanticContext({
  projectId,
  instruction: body.prompt,
  provider: aiProvider,
})
const result = await generateBoard({
  provider: aiProvider,
  prompt: body.prompt,
  snapshot,
  semanticMatches: semantic,
})
```

2. Replace the changes mapping (the `result.epics.flatMap(...)` block) with:

```ts
const knownCardIds = new Set(snapshot.cards.map((c) => c.id))
const { changes, skipped } = mapStoriesToChanges({
  epics: result.epics,
  cardSections: [],
  knownCardIds,
})
```

NOTE: `cardSections: []` — the route must load the project's actual cardSections. Fetch the project row (the route already resolves projectId; add a `db.select().from(project)` for `cardSections`) and pass `projectRow.cardSections`. If the AI response is `clarifying`, skip all of this (existing early return).

3. The persistProposal call now uses `changes` (with epicName inside newData for creates — the persistProposal mapping keeps `epicName: change.epicName` — adjust the change-mapping inside persistProposal OR include epicName in the newData objects at the call site; simplest: the existing create mapping adds `epicName: change.epicName` from the mapped change).

4. Return shape:

```ts
const summary: ProposalSummary = {
  created: changes.filter((c) => c.changeType === "create").length,
  updated: changes.filter((c) => c.changeType === "update").length,
  skipped,
}
return c.json(
  {
    success: true,
    data: { kind: "board", proposal: created, summary },
  },
  201
)
```

5. Mirror all of the above in `/clarify` (semantic context with `body.prompt`, mapping, summary, return shape).

6. The `aiResponse: JSON.stringify(result)` keeps storing the raw AI result (unchanged).

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun test src/__tests__/story-mapping.test.ts` in apps/api — PASS (5 tests).
Run: `bun test src/__tests__/per-card-approval.test.ts src/__tests__/column-routes.test.ts` — still PASS (route shape changes must not break existing 401 tests — they hit middleware first, safe).
Run: `bun run typecheck` + `bun run lint` — clean.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/story-mapping.ts apps/api/src/__tests__/story-mapping.test.ts apps/api/src/routes/ai.ts
git commit -m "feat(api): smart story mapping with create/update/skip and reply summary"
```

---

### Task 5: Web reply summary

**Files:**

- Modify: `apps/web/src/hooks/use-ai.ts`
- Modify: `apps/web/src/routes/proposals.tsx`

**Interfaces:**

- Consumes: API now returns `{ kind: "board", proposal, summary, summaryText }` — `summaryText` is the prebuilt string from Task 4's `buildReplySummaryText`
- Produces: web uses `result.summaryText` as the chat message content

- [ ] **Step 1: Update the web types**

In `apps/web/src/hooks/use-ai.ts` — read the file first and match its existing result-type pattern. The board-kind result gains:

```ts
  | {
      kind: "board"
      proposal: { proposalId: string; changeCount: number }
      summary: {
        created: number
        updated: number
        skipped: { title: string; reason: string }[]
      }
      summaryText: string
    }
```

- [ ] **Step 2: Wire the chat message**

In `apps/web/src/routes/proposals.tsx`, replace BOTH `content: \`Generated ${result.proposal.changeCount} story cards.\``lines (in`onGenerate`and`onClarifyAnswer`) with:

```tsx
content: result.summaryText,
```

(The `useAiGenerate`/`useAiClarify` mutation return types must include `summaryText` — Step 1. Check `apps/web/src/hooks/use-ai.ts`'s `mutateAsync` return typing covers both routes.)

- [ ] **Step 3: Verify**

Run: `bun run test use-ai` (or the hook's existing test file — update fixtures if they assert the old content shape).
Run: `bunx tsc -b --noEmit` from apps/web — 0 errors.
Run: `bun run typecheck` + `bun run lint` — clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-ai.ts apps/web/src/routes/proposals.tsx
git commit -m "feat(web): smart reply summary for generated proposals"
```

---

## Post-Plan Verification

- [ ] `bun run test` passes (root vitest)
- [ ] `bun test` passes in `apps/api` (`--parallel=2` if the health-check race appears)
- [ ] `bunx tsc -b --noEmit` clean in apps/web; `bun run typecheck` + `bun run lint` clean
- [ ] Manual: chat "add referral feature" twice → second run proposes update/skip; new cards carry all configured sections; reply shows counts
