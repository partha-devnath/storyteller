import type { ReactNode } from "react"
import { Link } from "react-router"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 [background:radial-gradient(620px_320px_at_82%_8%,rgba(96,165,250,0.13),transparent_60%),radial-gradient(480px_260px_at_8%_88%,rgba(96,165,250,0.06),transparent_60%)]"
      />
      <header className="relative flex items-center justify-between px-7 py-5">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[15px] font-bold"
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
        <Link
          to="/"
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          ← Back to site
        </Link>
      </header>
      <main className="relative grid flex-1 place-items-center px-6 pb-16">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[21px] font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1.5 mb-5 text-[13.5px] text-muted-foreground">
              {description}
            </p>
          )}
          <div className="rounded-2xl border border-input bg-card px-7 py-7">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
