import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"

export type TemplateCardProps = {
  icon: LucideIcon
  name: string
  description: string
  onUseTemplate: () => void
  pending?: boolean
}

/**
 * Single onboarding template option (UI-SPEC V3): icon + name + one-line
 * description + "Use template" primary sm button. Parent wraps the card with
 * the data-testid anchor (onboarding-template-{templateId}) and controls the
 * pending state so the button disables with "Creating…" during creation.
 */
export function TemplateCard({
  icon: Icon,
  name,
  description,
  onUseTemplate,
  pending = false,
}: TemplateCardProps) {
  return (
    <Card className="p-4">
      <CardContent className="flex h-full flex-col gap-2 p-0">
        <Icon className="size-3.5" />
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button
          size="sm"
          onClick={onUseTemplate}
          disabled={pending}
          className="mt-auto w-full"
        >
          {pending ? "Creating…" : "Use template"}
        </Button>
      </CardContent>
    </Card>
  )
}
