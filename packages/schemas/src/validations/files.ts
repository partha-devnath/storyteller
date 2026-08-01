import { z } from "zod"

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
] as const

export const ALLOWED_ALL_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export const uploadFileSchema = z.object({
  file: z.instanceof(File).refine((f) => f.size <= MAX_FILE_SIZE, {
    message: `File size must not exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  }),
  purpose: z.enum(["avatar", "attachment", "document"]).default("attachment"),
})

export type UploadFileInput = z.infer<typeof uploadFileSchema>
