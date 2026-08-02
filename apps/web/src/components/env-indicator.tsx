export function EnvIndicator() {
  const env = import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE
  if (env !== "staging") return null
  return (
    <span
      className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600"
      data-testid="env-badge"
      data-env="staging"
    >
      Staging
    </span>
  )
}
