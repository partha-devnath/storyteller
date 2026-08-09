# Design: GitHub/Trello column connectors

Date: 2026-08-09
Status: Approved

## Problem

Boards have fixed swimlanes with no way to manage them or connect them to
external trackers. Users want: manage board columns (add/rename/delete),
connect a column to GitHub or Trello, publish cards to the external tracker
when they enter that column, and see external ticket data back in the app.

## Scope

- Columns CRUD in settings (Backlog + Review locked; Proposed stays a
  virtual lane, never a real column)
- Per-column GitHub/Trello connection (API-key based credentials)
- Publish on entry, once (GitHub issue / Trello card)
- Show external ticket: board indicator, drawer link + live state + comments
- Cards in a deleted column move to Backlog

## Data model

### `project.columns` — extended

```ts
ProjectColumn = {
  key: string
  title: string
  locked?: boolean
  integration?: {
    type: "github" | "trello"
    credentialId: string
    target: string // github: "owner/repo"; trello: "list id"
    boardName?: string // trello board name for display
    listName?: string  // trello list name for display
  } | null
}
```

Defaults get `locked: true` on `backlog` and `review`. Existing projects
migrate via code default (no column added — `locked` computed by key).

### New table `integration_credential`

`packages/schemas/src/db/integration-credential.ts`:

```
id            text pk
projectId     text fk -> project (cascade)
provider      text "github" | "trello"
config        json    // github: { token }; trello: { apiKey, token }
createdAt     timestamp
updatedAt     timestamp
```

- `config` encrypted at rest (AES-256-GCM with server secret from env
  `INTEGRATION_SECRET`); API responses return `maskedConfig` only
  (`provider`, `createdAt`, no secrets)
- A column's `integration.credentialId` references this table
- Deleting a credential → column integrations referencing it are nulled

### `card.external_links` — new JSON column on `card`

```ts
ExternalLink = {
  id: string
  type: "github" | "trello"
  externalId: string
  url: string
  columnKey: string
  createdAt: string
}
```

## Publish on entry (event-bus subscriber)

`card.updated` already publishes on status changes. New subscriber in the
API (`apps/api/src/services/column-integration.ts`):

1. Card status changed → look up the new column's `integration`
2. If none → no-op
3. If a link for `{ columnKey, type }` already exists on the card → no-op
   (no duplicates on move-out/move-back)
4. Create external ticket:
   - GitHub: `POST /repos/{owner}/{repo}/issues` `{ title, body }` where
     body = description + acceptance criteria list
   - Trello: `POST /1/cards` `{ idList, name, desc }`
5. Store the link on the card; failures are logged, never block the move

## Fetch & show

- **Board card**: small provider icon (GitHub/Trello) when `externalLinks`
  non-empty
- **Drawer**: "External ticket" section — provider badge, title, link,
  live state, comments:
  - `GET /api/cards/:id/external/:linkId` → server proxies provider:
    - GitHub: issue state (open/closed) + last N comments
    - Trello: card list name (state) + commentCard actions
  - Fetch fires when drawer opens (live status per user requirement)

## Columns settings UI

"Board columns" tab (replaces read-only list in `project-settings.tsx`):

- Locked rows: Backlog + Review — locked badge, no actions
- Other rows: rename (title only; key immutable), delete (confirm →
  cards in that column move to Backlog), connect/disconnect
- Add column: name input → appends at end of list
- Connect dialog per provider:
  - GitHub: paste PAT (fine-grained, issues read/write on target repo) +
    repo `owner/name` → "Test connection" (GET repo) → save
  - Trello: paste API key + token → fetch boards → pick board → fetch
    lists → pick list → save
- Every action persists via the PATCH columns endpoint

## API

### `PATCH /api/projects/:slug` (extend existing)

Accepts `{ columns }` — full replace with validation:

- Locked columns (keys `backlog`, `review`) must be present unchanged
  (title/order/integration as-is — integration changes go through the
  connect endpoints)
- Keys unique, `/^[a-z][a-zA-Z0-9_]*$/`, titles 1-60 chars, max 12 columns
- Zod schema `updateProjectColumnsSchema` in
  `packages/schemas/src/validations/project.ts`

### Connect/disconnect

- `POST /api/projects/:slug/columns/:key/connect`
  body `{ provider, config: {...}, target: string }`
  → validates by calling the provider (GitHub: `GET /repos/{repo}`;
  Trello: `GET /1/lists/{id}`), creates credential row, sets
  `column.integration`, returns column
- `DELETE /api/projects/:slug/columns/:key/connect`
  → nulls `column.integration` (credential row kept or deleted when
  unreferenced)
- `GET /api/projects/:slug/integrations/trello/boards` and
  `/lists?board=` → proxy helpers for the connect dialog (Trello), using
  a passed `apiKey`/`token` in query (validated, not persisted)

### External fetch

- `GET /api/cards/:id/external/:linkId` → proxy provider, returns
  `{ state, url, comments: [{ author, text, createdAt }] }`

## Web hooks

- `useUpdateProject` extended (columns payload)
- New `useColumnIntegrations` / `useConnectColumn` / `useDisconnectColumn`
  in `apps/web/src/hooks/use-integrations.ts`
- `useCardExternalLink(cardId, linkId)` for the drawer

## Testing

- Schemas: column validation rules (locked preservation, keys, max 12)
- API: connect validates + stores credential (mock provider client);
  PATCH rejects locked-column changes; external fetch proxies
  (mock provider)
- Web: settings columns tab (add/rename/delete/connect flows, locked
  rows no actions); drawer external section renders link + state
- Unit: `column-integration.ts` publish-once logic (no duplicate on
  move-out/back) with mocked provider
- Manual: connect GitHub column → move card → issue appears in repo;
  drawer shows state + comments

## Not changing

- Drag-and-drop board, card move API shape (subscriber hooks into existing
  event)
- Proposals flow, AI generation, card sections
- Column keys of existing columns (only titles editable)
