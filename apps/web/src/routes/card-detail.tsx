import { useParams } from "react-router"
import { useCards } from "@/hooks/use-cards"
import { CardDrawer } from "@/components/card-drawer"
import { useState } from "react"

export function CardDetailPage() {
  const { slug, cardSlug } = useParams<{ slug: string; cardSlug: string }>()
  const { data: cards } = useCards(slug)
  const [dismissed, setDismissed] = useState(false)

  const card = cards?.find((c) => c.slug === cardSlug)

  if (!card) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Card not found.</p>
      </div>
    )
  }

  return (
    <CardDrawer
      cardId={card.id}
      open={!dismissed}
      onClose={() => setDismissed(true)}
      projectSlug={slug ?? ""}
    />
  )
}
