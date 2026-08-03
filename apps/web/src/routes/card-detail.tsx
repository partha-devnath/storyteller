import { Link, useNavigate, useParams } from "react-router"
import { useCards } from "@/hooks/use-cards"
import { CardDrawer } from "@/components/card-drawer"
import { buttonVariants } from "@workspace/ui/components/button"

export function CardDetailPage() {
  const { slug, cardSlug } = useParams<{ slug: string; cardSlug: string }>()
  const navigate = useNavigate()
  const { data: cards } = useCards(slug)
  const card = cards?.find((c) => c.slug === cardSlug)

  if (!card) {
    return (
      <div className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm text-muted-foreground">Card not found.</p>
        <Link
          to={`/projects/${slug ?? ""}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Back to board
        </Link>
      </div>
    )
  }

  return (
    <CardDrawer
      cardId={card.id}
      open
      onClose={() => navigate(`/projects/${slug ?? ""}`, { replace: true })}
      projectSlug={slug ?? ""}
    />
  )
}
