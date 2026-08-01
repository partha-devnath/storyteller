export type Logger = {
  info: (objOrMsg: Record<string, unknown> | string, msg?: string) => void
  warn: (objOrMsg: Record<string, unknown> | string, msg?: string) => void
  error: (objOrMsg: unknown, msg?: string) => void
  debug: (objOrMsg: Record<string, unknown> | string, msg?: string) => void
}
