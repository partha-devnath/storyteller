export type StoredFile = {
  id: string
  storedName: string
  path: string
  url: string
}

export interface StorageProvider {
  save(file: File, storedName: string): Promise<StoredFile>
  delete(storedName: string): Promise<void>
  url(storedName: string): string
  serve(storedName: string): Promise<Response>
}

export type S3Options = {
  bucket: string
  endpoint?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
  baseUrl?: string
}

export function createS3Storage(opts: S3Options): StorageProvider {
  const {
    bucket,
    endpoint,
    region = "us-east-1",
    accessKeyId,
    secretAccessKey,
    baseUrl,
  } = opts

  const clientInit: {
    region: string
    endpoint?: string
    credentials?: { accessKeyId: string; secretAccessKey: string }
    forcePathStyle: boolean
  } = {
    region,
    forcePathStyle: true,
  }

  if (endpoint) {
    clientInit.endpoint = endpoint
  }

  if (accessKeyId && secretAccessKey) {
    clientInit.credentials = { accessKeyId, secretAccessKey }
  }

  function resolveUrl(storedName: string): string {
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, "")}/${storedName}`
    }
    return `${endpoint ?? ""}/${bucket}/${storedName}`
  }

  return {
    async save(file, storedName) {
      const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3")
      const s3 = new S3Client(clientInit)
      const body =
        file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : file
      const mimeType = file.type || "application/octet-stream"

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storedName,
          Body: body,
          ContentType: mimeType,
        })
      )

      return {
        id: storedName,
        storedName,
        path: storedName,
        url: resolveUrl(storedName),
      }
    },

    async delete(storedName) {
      const { DeleteObjectCommand, S3Client } =
        await import("@aws-sdk/client-s3")
      const s3 = new S3Client(clientInit)
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: storedName })
      )
    },

    url(storedName) {
      return resolveUrl(storedName)
    },

    async serve(storedName) {
      const { GetObjectCommand, S3Client, NoSuchKey } =
        await import("@aws-sdk/client-s3")
      const s3 = new S3Client(clientInit)

      try {
        const obj = await s3.send(
          new GetObjectCommand({ Bucket: bucket, Key: storedName })
        )

        const headers = new Headers()
        if (obj.ContentType) headers.set("Content-Type", obj.ContentType)
        if (obj.ContentLength)
          headers.set("Content-Length", String(obj.ContentLength))
        headers.set("Cache-Control", "public, max-age=31536000, immutable")

        return new Response(obj.Body as ReadableStream, { headers })
      } catch (error) {
        if (error instanceof NoSuchKey) {
          return new Response("File not found", { status: 404 })
        }
        throw error
      }
    },
  }
}
