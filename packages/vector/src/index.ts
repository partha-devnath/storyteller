import { and, cosineDistance, desc, eq, sql } from "drizzle-orm"
import { db } from "@workspace/db"
import {
  card,
  cardEmbedding,
  chatMessage,
  chatMessageEmbedding,
} from "@workspace/schemas"
import { createLogger } from "@workspace/logger"
import { EMBEDDING_DIMENSIONS } from "@workspace/ai"
import type {
  LLMProvider,
  SemanticMatch,
  ChatHistoryItem,
} from "@workspace/ai/types"

const logger = createLogger("vector")

function buildEmbeddingId(): string {
  return crypto.randomUUID().split("-").join("").slice(0, 16)
}

function buildEmbeddingText(cardRow: typeof card.$inferSelect): string {
  const customValues = cardRow.customFields
    ? Object.values(cardRow.customFields)
    : []
  return [
    cardRow.title,
    cardRow.description ?? "",
    (cardRow.acceptanceCriteria ?? []).join("\n"),
    `priority:${cardRow.priority}`,
    `tags:${customValues.join(",")}`,
  ].join("\n")
}

export async function embedCard({
  cardId,
  provider,
}: {
  cardId: string
  provider: LLMProvider
}): Promise<void> {
  const [cardRow] = await db
    .select()
    .from(card)
    .where(eq(card.id, cardId))
    .limit(1)

  if (!cardRow) {
    logger.warn({ cardId }, "embedCard: card not found, skipping")
    return
  }

  const text = buildEmbeddingText(cardRow)
  const [vector] = await provider.embed([text])

  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    logger.warn(
      { cardId, dimensions: vector?.length },
      "embedCard: embedding has wrong dimension, skipping"
    )
    return
  }

  await db.delete(cardEmbedding).where(eq(cardEmbedding.cardId, cardId))

  const model = process.env.EMBEDDING_MODEL ?? "nvidia/nv-embed-v1"
  await db.insert(cardEmbedding).values({
    id: buildEmbeddingId(),
    cardId,
    embedding: vector,
    model,
  })
}

export async function embedChatMessage({
  messageId,
  provider,
}: {
  messageId: string
  provider: LLMProvider
}): Promise<void> {
  const [row] = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.id, messageId))
    .limit(1)

  if (!row || !row.content?.trim()) {
    return
  }

  const text = row.content.trim().slice(0, 2000)
  const [vector] = await provider.embed([text])

  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    logger.warn(
      { messageId, dimensions: vector?.length },
      "embedChatMessage: embedding has wrong dimension, skipping"
    )
    return
  }

  await db
    .delete(chatMessageEmbedding)
    .where(eq(chatMessageEmbedding.messageId, messageId))

  const model = process.env.EMBEDDING_MODEL ?? "nvidia/nv-embed-v1"
  await db.insert(chatMessageEmbedding).values({
    id: buildEmbeddingId(),
    messageId,
    embedding: vector,
    model,
  })
}

export async function chatHistorySearch({
  projectId,
  query,
  provider,
  limit = 5,
}: {
  projectId: string
  query: string
  provider: LLMProvider
  limit?: number
}): Promise<ChatHistoryItem[]> {
  const [queryVector] = await provider.embed([query])

  if (!queryVector || queryVector.length !== EMBEDDING_DIMENSIONS) {
    logger.warn(
      { dimensions: queryVector?.length },
      "chatHistorySearch: query embedding has wrong dimension, returning empty"
    )
    return []
  }

  const similarity = sql<number>`1 - (${cosineDistance(chatMessageEmbedding.embedding, queryVector)})`

  const rows = await db
    .select({
      role: chatMessage.role,
      kind: chatMessage.kind,
      content: chatMessage.content,
      createdAt: chatMessage.createdAt,
      similarity,
    })
    .from(chatMessageEmbedding)
    .innerJoin(chatMessage, eq(chatMessageEmbedding.messageId, chatMessage.id))
    .where(eq(chatMessage.projectId, projectId))
    .orderBy(desc(similarity))
    .limit(limit)

  return rows.map((row) => ({
    role: row.role,
    kind: row.kind,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    similarity: Number(row.similarity),
  }))
}

export async function reindexCard({
  cardId,
  provider,
  versionId,
}: {
  cardId: string
  provider: LLMProvider
  versionId: string
}): Promise<void> {
  const [cardRow] = await db
    .select()
    .from(card)
    .where(eq(card.id, cardId))
    .limit(1)

  if (!cardRow) {
    logger.warn({ cardId }, "reindexCard: card not found, skipping")
    return
  }

  const text = buildEmbeddingText(cardRow)
  const [vector] = await provider.embed([text])

  if (!vector || vector.length !== EMBEDDING_DIMENSIONS) {
    logger.warn(
      { cardId, dimensions: vector?.length },
      "reindexCard: embedding has wrong dimension, skipping"
    )
    return
  }

  await db.delete(cardEmbedding).where(eq(cardEmbedding.cardId, cardId))

  const model = process.env.EMBEDDING_MODEL ?? "nvidia/nv-embed-v1"
  await db.insert(cardEmbedding).values({
    id: crypto.randomUUID().split("-").join("").slice(0, 16),
    cardId,
    versionId,
    embedding: vector,
    model,
  })
}

export async function semanticSearch({
  projectId,
  query,
  provider,
  limit = 6,
}: {
  projectId: string
  query: string
  provider: LLMProvider
  limit?: number
}): Promise<SemanticMatch[]> {
  const [queryVector] = await provider.embed([query])

  if (!queryVector || queryVector.length !== EMBEDDING_DIMENSIONS) {
    logger.warn(
      { dimensions: queryVector?.length },
      "semanticSearch: query embedding has wrong dimension, returning empty"
    )
    return []
  }

  const similarity = sql<number>`1 - (${cosineDistance(cardEmbedding.embedding, queryVector)})`

  const rows = await db
    .select({
      cardId: card.id,
      title: card.title,
      slug: card.slug,
      isClosed: card.isClosed,
      similarity,
    })
    .from(cardEmbedding)
    .innerJoin(card, eq(cardEmbedding.cardId, card.id))
    .where(and(eq(card.projectId, projectId)))
    .orderBy(desc(similarity))
    .limit(limit)

  return rows.map((row) => ({
    cardId: row.cardId,
    title: row.title,
    slug: row.slug,
    isClosed: row.isClosed,
    similarity: Number(row.similarity),
  }))
}
