import { Button } from "@workspace/ui/components/button"

export type LiveStatus = "connecting" | "open" | "closed"

export function LiveIndicator({
  status,
  onRetry,
}: {
  status: LiveStatus
  onRetry: () => void
}) {
  return (
    <div
      data-testid="live-indicator"
      data-status={status}
      className="flex items-center gap-2 text-xs"
    >
      {status === "connecting" && (
        <>
          <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
          Connecting…
        </>
      )}
      {status === "open" && (
        <>
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live
        </>
      )}
      {status === "closed" && (
        <>
          <span
            className="size-1.5 rounded-full bg-muted-foreground/50"
            aria-hidden
          />
          Offline — updates paused
          <Button variant="ghost" size="xs" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  )
}
