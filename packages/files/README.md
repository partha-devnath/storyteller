# @workspace/files

S3-compatible file storage adapter. Works with **AWS S3**, **floci S3**, **Google Cloud Storage**, **Cloudflare R2**, **LocalStack**, and any S3-compatible provider.

## Interface

```ts
export interface StorageProvider {
  save(file: File, storedName: string): Promise<StoredFile>
  delete(storedName: string): Promise<void>
  url(storedName: string): string
  serve(storedName: string): Promise<Response>
}
```

| Method                   | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `save(file, storedName)` | Upload a file, returns metadata including the public URL   |
| `delete(storedName)`     | Remove a file from storage                                 |
| `url(storedName)`        | Return the public/cdn URL for a stored file                |
| `serve(storedName)`      | Stream the file contents (handles private buckets via SDK) |

## Usage

```ts
import { createS3Storage } from "@workspace/files"

const storage = createS3Storage({
  bucket: "my-bucket",
  region: "us-east-1",
  accessKeyId: "AKIAxxxxxxxxxxxx",
  secretAccessKey: "xxxxxxxxxxxx",
  baseUrl: "https://cdn.example.com", // optional CDN base URL
})

// For a local S3-compatible endpoint (e.g., LocalStack):
const localStorage = createS3Storage({
  bucket: "my-bucket",
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  accessKeyId: "test",
  secretAccessKey: "test",
})
```

## Environment Variables

| Variable               | Required            | Default     | Description                         |
| ---------------------- | ------------------- | ----------- | ----------------------------------- |
| `S3_ENDPOINT`          | For local endpoints | —           | S3-compatible endpoint URL          |
| `S3_REGION`            | No                  | `us-east-1` | AWS region                          |
| `S3_ACCESS_KEY_ID`     | For private buckets | —           | Access key                          |
| `S3_SECRET_ACCESS_KEY` | For private buckets | —           | Secret key                          |
| `S3_BUCKET`            | Yes                 | —           | Bucket name                         |
| `S3_BASE_URL`          | No                  | —           | Optional CDN URL prefix for `url()` |

## Implementing a Custom Adapter

Implement the `StorageProvider` interface to support any backend:

```ts
import type { StorageProvider } from "@workspace/files"

function createGcsAdapter(opts: {
  bucket: string
  serviceAccountKey: string
}): StorageProvider {
  return {
    async save(file, storedName) {
      // Upload to GCS
      // Return { id, storedName, path, url }
    },
    async delete(storedName) {
      // Delete from GCS
    },
    url(storedName) {
      // Return public GCS URL
    },
    async serve(storedName) {
      // Stream file from GCS
      // Return new Response(stream, { headers })
    },
  }
}
```

Key requirements:

- **`save`** — Upload the file bytes. Return metadata including a `url` property.
- **`delete`** — Remove the file from storage. Throw on failure.
- **`url`** — Return a direct URL. If using a CDN, return the CDN URL. Can be signed/presigned.
- **`serve`** — Return a `Response` with the file contents. Use the provider's SDK to fetch the object. Set `Content-Type`, `Content-Length`, and `Cache-Control` headers.

The `serve` method should handle the case where the file doesn't exist by returning `new Response("File not found", { status: 404 })`.

## File Upload Validation

Upload validation is handled by `packages/schemas/src/validations/files.ts`:

```ts
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@workspace/schemas"

await uploadFile({
  storage,
  userId,
  file,
  allowedMimeTypes: ALLOWED_IMAGE_TYPES,
  maxSize: MAX_FILE_SIZE,
})
```
