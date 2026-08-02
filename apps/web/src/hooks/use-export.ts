import { useState } from "react"

export type ExportFormat = "csv" | "json" | "md"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export function useExport(projectSlug: string): {
  exportBoard: (format: ExportFormat) => Promise<void>
  isExporting: boolean
} {
  const [isExporting, setIsExporting] = useState(false)

  async function exportBoard(format: ExportFormat): Promise<void> {
    setIsExporting(true)
    try {
      const response = await fetch(
        `${API_URL}/api/projects/${projectSlug}/export?format=${format}`,
        { credentials: "include" }
      )
      if (!response.ok) {
        throw new Error("Export failed")
      }
      const blob = await response.blob()
      const disposition = response.headers.get("Content-Disposition")
      const dispositionFilename = disposition
        ? /filename="?([^";]+)"?/.exec(disposition)?.[1]
        : undefined
      const filename = dispositionFilename ?? `${projectSlug}-${format}`

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } finally {
      setIsExporting(false)
    }
  }

  return { exportBoard, isExporting }
}
