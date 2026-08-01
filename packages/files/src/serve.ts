import type { StorageProvider } from "./storage"

export async function serveFile(
  storage: StorageProvider,
  storedName: string
): Promise<Response> {
  return storage.serve(storedName)
}
