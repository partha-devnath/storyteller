# Design: Custom card sections CRUD

Date: 2026-08-09
Status: Approved

## Problem

Card sections (the sections the AI generates on each new card) exist in the
schema with two locked built-ins (Description, Acceptance criteria), and the
AI prompts already consume them. But there is no way to add, edit, or delete
custom sections — the settings UI shows a read-only list and no API endpoint
can modify `project.cardSections`.

## Scope

Settings CRUD only. No changes to card persistence (`card.sections`), card
rendering, or AI prompts (they already pick up custom sections). Deferred:
persisting AI-generated sections onto cards and rendering them on the card
page.

## API

### `PATCH /api/projects/:slug`

Body: `{ cardSections: CardSection[] }` — the full list.

Middleware: `resolveOrgFromProject`, `requireRole("owner", "admin", "member")`
(matches the role gate on project creation).

Validation (`updateCardSectionsSchema` in
`packages/schemas/src/validations/project.ts`):

- `cardSections`: array of `{ key, label, description, builtIn }`
- `label`: string, 1-60 chars
- `description`: string, 1-300 chars
- `key`: string matching `/^[a-z][a-zA-Z0-9]*$/` (camelCase)
- `builtIn`: boolean

Route handler invariants (checked after zod, throw 400 on violation):

- Built-ins `description` and `acceptanceCriteria` must be present with
  their exact default entries (label/description/builtIn) and must stay
  first in the list
- No key collisions with built-in keys; no duplicate custom keys
- Custom sections must have `builtIn: false` (flag is not settable — the
  schema default entry marks them)

Handler: replace `cardSections`, bump `updatedAt`, return updated project row.

## Web

### Hook — `useUpdateProject(slug)` in `apps/web/src/hooks/use-projects.ts`

Mutation: `PATCH /api/projects/:slug` with `{ cardSections }`. On success
invalidate `["project", slug]`. Mirrors `useDeleteProject` pattern.

### Settings UI — `apps/web/src/routes/project-settings.tsx`, "Card sections" tab

- Built-in rows: locked — label + description + "built-in" badge, no buttons
- Custom rows: label + description + Edit / Delete buttons
- "Add section" button opens an inline form with label + description
  inputs; key is generated client-side at creation time (camelCase of
  label, e.g. "Team size" → `teamSize`; duplicate keys get a numeric
  suffix) and never changes afterwards
- Edit: same inline form pre-filled; only label/description editable
- Delete: confirm, removes the custom row
- Every action persists immediately via `useUpdateProject` with the full
  new array (no save button); toast on error (existing `toast.error`
  pattern); mutation pending state disables the action buttons

## Testing

- API: PATCH returns 401 without session (existing test pattern); zod
  schema unit tests cover label/description/key/builtIn rules
- Web: component test for the sections tab (mock `useProject` +
  `useUpdateProject`): renders built-ins locked, adds a section (key
  generated), edits, deletes, built-in rows have no edit/delete buttons

## Not changing

- AI prompts (`generate-board`, `process-instruction`) — already consume
  `cardSections`
- `card.sections` storage and card detail rendering
- Proposals / chat flows
- Board columns management (out of scope)
