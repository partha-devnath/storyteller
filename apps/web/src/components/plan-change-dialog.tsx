import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"

export type PlanChangeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  pending: boolean
}

/**
 * Downgrade confirmation dialog (UI-SPEC V2d). Copy is fixed by the
 * Copywriting Contract — exact strings below.
 */
export function PlanChangeDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: PlanChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="plan-change-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Downgrade to Free?
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm">
          You'll lose Pro features immediately after confirming. If you're over
          a Free-plan limit, extra projects, members, and cards are kept but
          locked until you upgrade or reduce usage.
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="ghost"
            data-testid="plan-change-cancel"
            onClick={() => onOpenChange(false)}
          >
            Keep Pro
          </Button>
          <Button
            variant="destructive"
            data-testid="plan-change-confirm"
            onClick={onConfirm}
            disabled={pending}
          >
            Downgrade to Free
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
