import { db } from "@workspace/db"
import { file as fileSchema } from "@workspace/schemas"
import { createLogger } from "@workspace/logger"
import { generateId } from "./utils"
import type { StorageProvider } from "./storage"

const logger = createLogger("files")

export type UploadResult = {
  id: string
  originalName: string
  mimeType: string
  size: number
  url: string
}

export type UploadOptions = {
  storage: StorageProvider
  userId: string
  file: File
  allowedMimeTypes?: readonly string[]
  maxSize?: number
  purpose?: string
}

const SAFE_EXT_RE = /^[a-zA-Z0-9]+$/

export async function uploadFile(opts: UploadOptions): Promise<UploadResult> {
  const { storage, userId, file, allowedMimeTypes, maxSize } = opts

  if (maxSize && file.size > maxSize) {
    throw new Error(`File size ${file.size} exceeds limit of ${maxSize}`)
  }

  if (
    allowedMimeTypes &&
    allowedMimeTypes.length > 0 &&
    !allowedMimeTypes.includes(file.type)
  ) {
    throw new Error(
      `File type "${file.type}" is not allowed. Allowed: ${allowedMimeTypes.join(", ")}`
    )
  }

  const ext = file.name.split(".").pop() ?? "bin"
  if (!SAFE_EXT_RE.test(ext)) {
    throw new Error(`Unsafe file extension: ${ext}`)
  }

  const storedName = `${generateId()}.${ext}`
  const stored = await storage.save(file, storedName)

  const [record] = await db
    .insert(fileSchema)
    .values({
      id: stored.id,
      userId,
      originalName: file.name,
      storedName,
      mimeType: file.type,
      size: file.size,
      path: stored.path,
      url: stored.url,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  logger.info({ fileId: record.id, originalName: file.name }, "File uploaded")

  return {
    id: record.id,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    url: record.url,
  }
}
