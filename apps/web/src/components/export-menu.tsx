import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { Button } from "@workspace/ui/components/button"
import { Braces, Download, FileText, TextIcon } from "lucide-react"

export type ExportFormat = "csv" | "json" | "md"

export function ExportMenu({
  disabled,
  onExport,
}: {
  disabled: boolean
  onExport: (format: ExportFormat) => void
}) {
  const trigger = (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      data-testid="export-menu"
      aria-label="Export"
    >
      <Download />
      Export
    </Button>
  )

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex" data-testid="export-menu-trigger" />
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled
            data-testid="export-menu"
          >
            <Download />
            Export
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add cards before exporting</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          data-testid="export-csv"
          onClick={() => onExport("csv")}
        >
          <TextIcon />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="export-json"
          onClick={() => onExport("json")}
        >
          <Braces />
          Export JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="export-markdown"
          onClick={() => onExport("md")}
        >
          <FileText />
          Export Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
