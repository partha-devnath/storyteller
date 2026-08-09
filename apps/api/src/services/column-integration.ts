import { eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { card, project, integrationCredential } from "@workspace/schemas"
import { subscribeAll } from "./event-bus"
import { realProviders, type ProviderClients } from "./providers"
import { encryptConfig, decryptConfig } from "./credential-crypto"
import { createLogger } from "@workspace/logger"
import { httpError } from "../middleware/org-scope"

const logger = createLogger("api")

export function registerColumnIntegrationSubscriber(
  providers: ProviderClients = realProviders
): () => void {
  return subscribeAll(async (projectId, event) => {
    if (event.type !== "card.updated") return
    try {
      await publishCardToColumn({
        projectId,
        cardId: event.card.id,
        status: event.card.status,
        providers,
      })
    } catch (error) {
      logger.warn(
        { projectId, cardId: event.card.id, error },
        "column integration: publish failed"
      )
    }
  })
}

export function assertConnectableColumn(
  columns: { key: string; locked?: boolean }[],
  key: string
): { key: string; locked?: boolean } {
  const column = columns.find((c) => c.key === key)
  if (!column) throw httpError("Column not found", 404)
  if (column.locked) throw httpError("System columns cannot be connected", 400)
  return column
}

export async function storeCredential(params: {
  projectId: string
  provider: "github" | "trello"
  config: Record<string, string>
}): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(integrationCredential).values({
    id,
    projectId: params.projectId,
    provider: params.provider,
    config: encryptConfig(params.config),
  })
  return id
}

export async function publishCardToColumn({
  projectId,
  cardId,
  status,
  providers = realProviders,
}: {
  projectId: string
  cardId: string
  status: string
  providers?: ProviderClients
}): Promise<void> {
  const [proj] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  if (!proj) return

  const column = proj.columns.find((c) => c.key === status)
  if (!column?.integration) return

  const [cred] = await db
    .select()
    .from(integrationCredential)
    .where(eq(integrationCredential.id, column.integration.credentialId))
    .limit(1)
  if (!cred) return

  const [cardRow] = await db
    .select()
    .from(card)
    .where(eq(card.id, cardId))
    .limit(1)
  if (!cardRow) return

  const existing = cardRow.externalLinks.some(
    (l) => l.columnKey === status && l.type === cred.provider
  )
  if (existing) return

  const config = decryptConfig(cred.config)
  const body = [
    cardRow.description ?? "",
    "",
    "Acceptance criteria:",
    ...cardRow.acceptanceCriteria.map((c) => `- ${c}`),
  ].join("\n")

  let externalId: string
  let url: string
  if (cred.provider === "github") {
    const created = await providers.github.createIssue({
      token: config.token,
      repo: column.integration.target,
      title: cardRow.title,
      body,
    })
    externalId = created.externalId
    url = created.url
  } else {
    const created = await providers.trello.createCard({
      apiKey: config.apiKey,
      token: config.token,
      idList: column.integration.target,
      name: cardRow.title,
      desc: body,
    })
    externalId = created.externalId
    url = created.url
  }

  await db
    .update(card)
    .set({
      externalLinks: [
        ...cardRow.externalLinks,
        {
          id: crypto.randomUUID(),
          type: cred.provider,
          externalId,
          url,
          columnKey: status,
          credentialId: cred.id,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date(),
    })
    .where(eq(card.id, cardId))
}
