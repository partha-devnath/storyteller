import { useToastStore } from "@/stores/toast-store"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Fixed-position toast viewport. Renders nothing while the queue is empty.
 * Success = neutral card, error = destructive-tinted border/text
 * (Copywriting Contract: destructive toasts carry the destructive signal).
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
      data-testid="toaster"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          data-testid="toast"
          data-kind={t.kind}
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm shadow-lg",
            t.kind === "error"
              ? "border-destructive/40 text-destructive"
              : "border-border"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
