export const priorityClasses: Record<string, string> = {
  critical: "border border-destructive/40 bg-destructive/10 text-destructive",
  high: "border border-warn/40 bg-warn/10 text-warn",
  medium: "border border-primary/40 bg-primary/10 text-primary",
  low: "border border-border bg-muted text-muted-foreground",
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case "critical":
      return "P0"
    case "high":
      return "P1"
    case "medium":
      return "P2"
    default:
      return ""
  }
}
