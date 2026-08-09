import { eq } from "drizzle-orm"
import { db } from "@workspace/db"
import { card, project, integrationCredential } from "@workspace/schemas"
import { createLogger } from "@workspace/logger"
import {
  realProviders,
  githubAuthFromConfig,
  type ProviderClients,
} from "./providers"
import { decryptConfig } from "./credential-crypto"

const logger = createLogger("api/github-sync")

type DiffableFields = {
  title?: string
  description?: string
  status?: string
  priority?: string
  acceptanceCriteria?: string[]
}

export function buildCardDiffLines(
  before: DiffableFields,
  after: DiffableFields
): string[] {
  const lines: string[] = []
  if (after.title !== undefined && before.title !== after.title) {
    lines.push(`**Title**: "${before.title ?? ""}" → "${after.title}"`)
  }
  if (
    after.description !== undefined &&
    before.description !== after.description
  ) {
    lines.push("**Description**: updated")
  }
  if (after.status !== undefined && before.status !== after.status) {
    lines.push(`**Status**: "${before.status ?? ""}" → "${after.status}"`)
  }
  if (after.priority !== undefined && before.priority !== after.priority) {
    lines.push(`**Priority**: "${before.priority ?? ""}" → "${after.priority}"`)
  }
  if (
    after.acceptanceCriteria !== undefined &&
    JSON.stringify(before.acceptanceCriteria ?? []) !==
      JSON.stringify(after.acceptanceCriteria)
  ) {
    lines.push("**Acceptance criteria**: updated")
  }
  return lines
}

export async function syncCardCommentToGithub({
  projectId,
  cardId,
  lines,
  providers = realProviders,
}: {
  projectId: string
  cardId: string
  lines: string[]
  providers?: ProviderClients
}): Promise<void> {
  if (lines.length === 0) return

  const [cardRow] = await db
    .select()
    .from(card)
    .where(eq(card.id, cardId))
    .limit(1)
  if (!cardRow) return

  const githubLinks = cardRow.externalLinks.filter((l) => l.type === "github")
  if (githubLinks.length === 0) return

  const [proj] = await db
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1)
  if (!proj) return

  const body = ["**Storyteller sync**", ...lines].join("\n")

  for (const link of githubLinks) {
    const column = proj.columns.find((col) => col.key === link.columnKey)
    const repo = column?.integration?.target
    if (!repo) {
      logger.warn(
        { cardId, linkId: link.id },
        "github-sync: column integration missing for link, skipping"
      )
      continue
    }

    const [cred] = await db
      .select()
      .from(integrationCredential)
      .where(eq(integrationCredential.id, link.credentialId))
      .limit(1)
    if (!cred) continue

    const config = decryptConfig(cred.config)
    try {
      await providers.github.createComment({
        auth: githubAuthFromConfig(config),
        repo,
        issueNumber: link.externalId,
        body,
      })
      logger.info(
        { cardId, issueNumber: link.externalId, repo },
        "github-sync: posted sync comment"
      )
    } catch (error) {
      logger.warn(
        {
          cardId,
          issueNumber: link.externalId,
          repo,
          error: error instanceof Error ? error.message : String(error),
        },
        "github-sync: failed to post comment"
      )
    }
  }
}
