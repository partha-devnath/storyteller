import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

const features = [
  {
    title: "Living cards",
    body: "Open cards update after approval; closed cards freeze and spawn replacements.",
  },
  {
    title: "Approvals",
    body: "AI proposals queue for review — you approve what ships to the board.",
  },
  {
    title: "Version history",
    body: "Every change versions a card; roll back to any moment in its story.",
  },
  {
    title: "Semantic memory",
    body: "Similar cards surface by meaning, not keywords — catch duplicates and contradictions.",
  },
]

const steps = ["Prompt", "Review", "Live"]

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <span className="text-lg font-semibold">Storyteller</span>
        <nav className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-6 py-20">
        <section className="flex flex-col items-center gap-6 text-center">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Turn a product idea into a living requirements board.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            AI generates, reviews, and keeps your stories in sync — describe an
            idea, approve the board, and watch closed cards evolve into new
            ones.
          </p>
          <Link to="/signup">
            <Button size="lg">Sign up free</Button>
          </Link>
        </section>

        <section className="grid gap-4 rounded-2xl border p-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step} className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Step {i + 1}
              </span>
              <p className="text-lg font-semibold">{step}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl border p-6">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Example board
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {["Backlog", "In Progress", "Done"].map((col) => (
              <div key={col} className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-3 text-xs font-semibold">{col}</p>
                {col === "Backlog" && (
                  <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
                    Loyalty rewards catalog
                  </div>
                )}
                {col === "In Progress" && (
                  <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
                    Loyalty points accrual
                  </div>
                )}
                {col === "Done" && (
                  <div className="rounded-md border bg-background p-2 text-xs opacity-60 shadow-sm">
                    Loyalty enrollment flow
                    <span className="ml-2 rounded-full bg-muted px-1.5 text-[10px]">
                      closed
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold">
            Start telling your product's story.
          </h2>
          <Link to="/signup">
            <Button size="lg">Create your first board</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        Storyteller — living requirements, powered by AI.
      </footer>
    </div>
  )
}
