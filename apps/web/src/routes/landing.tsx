import { useState } from "react"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  ArrowRight,
  CircleCheckBig,
  Lock,
  Search,
  Sparkles,
} from "lucide-react"

const features = [
  {
    title: "Living Requirements Engine",
    body: "Instruct the AI in plain English. It generates or refines requirement cards, proposes a side-by-side diff, and waits for your approval — never edits silently.",
    kicker: "Instruct → Propose → Approve",
    icon: Sparkles,
    tint: "text-primary",
  },
  {
    title: "Immutable History",
    body: "Every approved card is frozen in a rail and becomes permanently immutable. Past decisions can't be quietly edited — only deliberately replaced, with lineage preserved.",
    kicker: "Freeze → Replace → Trace",
    icon: Lock,
    tint: "text-destructive",
  },
  {
    title: "Graph View & Lineage Map",
    body: "See how every requirement relates. Active nodes in focus, frozen legacy in dashed red, with dependency arrows and glowing evolution paths between replacements.",
    kicker: "Zoom · Filter · Export",
    icon: CircleCheckBig,
    tint: "text-success",
  },
  {
    title: "Semantic Recall",
    body: "Similar and contextually related cards are surfaced automatically so new proposals never contradict the frozen decisions your team has already made.",
    kicker: "Vector index · healthy",
    icon: Search,
    tint: "text-warn",
  },
]

const steps = [
  {
    n: "01",
    title: "Describe the prompt",
    body: "Type what should change or what new requirement you need, in your own words.",
    pill: "natural language",
    color: "bg-primary",
  },
  {
    n: "02",
    title: "AI generates the card",
    body: "Storyteller drafts the story, acceptance criteria, and a proposed diff — as a reviewable proposal, never a silent edit.",
    pill: "side-by-side diff",
    color: "bg-sky-400",
  },
  {
    n: "03",
    title: "Approve changes",
    body: "Review, tweak, and approve. The approver and timestamp are written to the immutable audit trail.",
    pill: "audit-ready",
    color: "bg-success",
  },
  {
    n: "04",
    title: "Track evolution",
    body: "Each approved change freezes a version. Follow lineage across graph and clone as your product grows.",
    pill: "graph + frozen rail",
    color: "bg-warn",
  },
]

const demoBank = [
  {
    t: "Export past invoices",
    s: "Add a CSV export action to the invoice table.",
  },
  {
    t: "Approval notifications",
    s: "Email each member when a proposal is awaiting review.",
  },
  {
    t: "Frozen archive",
    s: "Keep the last frozen clone of every shipped layout.",
  },
  {
    t: "Semantic recall",
    s: "Auto-suggest similar older requirements at proposal time.",
  },
  { t: "Single sign-on", s: "Support Okta/Entra for read-only viewers." },
]

type DemoCard = { id: string; title: string; sub: string }

let demoSeq = 0

export function LandingPage() {
  const [demoInput, setDemoInput] = useState("")
  const [demoCards, setDemoCards] = useState<DemoCard[]>([
    {
      id: "REQ-096",
      title: "Export past invoices",
      sub: "Add a CSV/CSV download action to the invoice table.",
    },
    {
      id: "REQ-097",
      title: "Chart export",
      sub: "Allow export of dashboard charts as PNG snapshots.",
    },
  ])

  function runDemo() {
    const next: DemoCard[] = []
    if (demoInput.trim()) {
      next.push({
        id: `REQ-${201 + demoSeq++}`,
        title: demoInput.trim(),
        sub: "New AI-proposed requirement card.",
      })
    }
    const roll = demoBank[Math.floor(Math.random() * demoBank.length)]
    next.push({
      id: `REQ-${100 + Math.floor(Math.random() * 90) + 1}`,
      title: roll.t,
      sub: `${roll.t} — ${roll.s}`,
    })
    setDemoCards((prev) => [...next, ...prev].slice(0, 5))
    setDemoInput("")
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-8 px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-base font-bold"
          >
            <span className="grid size-6.5 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="size-4"
              >
                <path d="M13 2 3 14h6l-2 8 10-12h-6l2-8z" />
              </svg>
            </span>
            Storyteller
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#demo" className="hover:text-foreground">
              Live demo
            </a>
            <a href="#how" className="hover:text-foreground">
              How it works
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full">
        <section className="relative overflow-hidden py-20 [background:radial-gradient(120%_120%_at_20%_0%,#16233f_0%,transparent_55%)] md:py-24">
          <div className="mx-auto w-full max-w-[1180px] px-6">
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 font-mono text-xs text-foreground/80">
                <span className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" />
                AI-native requirements engine · v2.0
              </span>
              <h1 className="mt-6 max-w-[760px] text-5xl leading-[1.05] font-bold tracking-tight md:text-6xl">
                Turn plain English ideas into{" "}
                <span className="text-primary">living, auditable</span>{" "}
                requirement boards.
              </h1>
              <p className="mt-5 max-w-[600px] text-lg text-muted-foreground">
                Storyteller turns natural-language prompts into
                version-controlled, AI-proposed requirement cards — with
                immutable history, evolution lineage, and a full audit trail on
                every frozen decision.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/signup">
                  <Button size="lg">
                    Start building free
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <a href="#demo">
                  <Button variant="outline" size="lg">
                    See the live demo
                  </Button>
                </a>
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground">
                Free for 3 members ·{" "}
                <b className="font-medium text-foreground/80">Own every line</b>{" "}
                of your requirement history
              </p>

              <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border/60 bg-secondary px-4 py-3">
                  <span className="flex gap-1.5">
                    <i className="size-2.5 rounded-full bg-destructive/70" />
                    <i className="size-2.5 rounded-full bg-warn/70" />
                    <i className="size-2.5 rounded-full bg-success/70" />
                  </span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    storyteller — prompt → board
                  </span>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3.5">
                    <Sparkles className="size-4.5 shrink-0 text-primary" />
                    <span className="text-[15px] font-medium text-foreground/90">
                      Add a 'Pay with Stripe' checkout step before order
                      confirmation
                    </span>
                    <span className="ml-auto shrink-0 rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
                      v1.3 · draft
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-3.5">
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px] font-semibold text-warn">
                          DRAFT
                        </span>
                        <span className="font-mono text-[11px] text-primary">
                          REQ-088
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        Stripe checkout
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Accept payment before order is confirmed.
                      </p>
                      <div className="mt-2.5 flex gap-1.5">
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          payment
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          v1.0
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3.5">
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px] font-semibold text-primary">
                          PROPOSED
                        </span>
                        <span className="font-mono text-[11px] text-primary">
                          REQ-102
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">Payment gate</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        AI proposes Stripe + PayPal alternatives.
                      </p>
                      <div className="mt-2.5 flex gap-1.5">
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          payment
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          v1.2
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-3.5">
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px] font-semibold text-success">
                          APPROVED
                        </span>
                        <span className="font-mono text-[11px] text-primary">
                          REQ-104
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        Checkout flow
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Customer confirms order via Stripe.
                      </p>
                      <div className="mt-2.5 flex gap-1.5">
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          frozen
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          v2.1
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1180px] px-6">
          <section id="features" className="py-20">
            <div className="max-w-[640px]">
              <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
                Core system
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Four capabilities that make requirements trustworthy.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Built for teams where requirements are legal-grade assets — not
                scratch notes.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-border"
                >
                  <span
                    className={`grid size-10.5 place-items-center rounded-xl border border-border bg-secondary ${f.tint}`}
                  >
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                  <p className="mt-4 font-mono text-xs font-medium text-muted-foreground">
                    {f.kicker}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="demo" className="pb-20">
            <div className="max-w-[640px]">
              <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
                Sandbox
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Try it before you sign up.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Type any product idea below and watch it become a set of
                AI-proposed requirement cards.
              </p>
            </div>
            <div className="mt-10 rounded-2xl border border-border/60 bg-card p-6">
              <div className="grid gap-6 md:grid-cols-[340px_1fr]">
                <div>
                  <h3 className="text-lg font-semibold">Prompt the engine</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The same bar that runs your real board — same generation, no
                    data touched.
                  </p>
                  <label
                    htmlFor="demo-input"
                    className="mt-5 block font-mono text-xs font-medium tracking-[0.1em] text-foreground/80 uppercase"
                  >
                    Your idea
                  </label>
                  <textarea
                    id="demo-input"
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runDemo()
                    }}
                    placeholder="e.g. Let users export a CSV of their past approvals…"
                    className="mt-2 min-h-[92px] w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
                  />
                  <Button className="mt-3.5" onClick={runDemo}>
                    Generate cards
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
                <div className="border-l border-border/60 pl-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                      Output
                    </span>
                    <span className="inline-flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                      <span className="size-1.5 rounded-full bg-primary" /> live
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {demoCards.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-background px-3.5 py-3"
                      >
                        <span className="w-14 shrink-0 font-mono text-[11px] text-primary">
                          {c.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {c.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.sub}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-primary">
                          Proposed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="how" className="pb-20">
            <div className="max-w-[640px]">
              <span className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
                Workflow
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                From idea to frozen decision in four steps.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className="relative rounded-2xl border border-border/60 bg-card p-5"
                >
                  <span
                    className={`absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl ${s.color}`}
                  />
                  <span className="font-mono text-2xl font-bold text-primary/50">
                    {s.n}
                  </span>
                  <h3 className="mt-3.5 text-[15px] font-semibold">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    {s.body}
                  </p>
                  <span className="mt-3 inline-block rounded border border-border px-2 py-0.5 font-mono text-[11px] text-foreground/80">
                    {s.pill}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="pb-20">
            <div className="rounded-2xl border border-border/60 bg-card px-6 py-12 text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Your requirements deserve better than a doc.
              </h2>
              <p className="mx-auto mt-3 max-w-[520px] text-muted-foreground">
                Start a board in minutes. Approve with confidence. Trace every
                decision back.
              </p>
              <Link to="/signup" className="mt-7 inline-block">
                <Button size="lg">Create your first board</Button>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-10">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div className="max-w-[280px]">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-base font-bold"
              >
                <span className="grid size-6.5 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-primary-foreground">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className="size-4"
                  >
                    <path d="M13 2 3 14h6l-2 8 10-12h-6l2-8z" />
                  </svg>
                </span>
                Storyteller
              </Link>
              <p className="mt-3 text-[13px] text-muted-foreground">
                The living, auditable requirements engine — trusted where
                decisions are frozen for good.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded border border-success/40 bg-success/10 px-2 py-1 font-mono text-[11px] text-success">
                <span className="size-1.5 rounded-full bg-success" />
                All systems operational
              </span>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm">
              <div>
                <h4 className="mb-3 text-[13px] font-semibold">Product</h4>
                <a
                  href="#features"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Features
                </a>
                <Link
                  to="/dashboard"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  to="/projects"
                  className="block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Board view
                </Link>
              </div>
              <div>
                <h4 className="mb-3 text-[13px] font-semibold">Legal</h4>
                <a
                  href="#features"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Privacy
                </a>
                <a
                  href="#features"
                  className="mb-2.5 block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Terms
                </a>
                <a
                  href="#features"
                  className="block text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Security
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-between gap-2 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            <span>© 2026 Storyteller Systems, Inc.</span>
            <span>Built on pgvector · Postgres · AI review pipelines</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
