export class AiOutputError extends Error {
  readonly issues?: unknown

  constructor(message: string, issues?: unknown) {
    super(message)
    this.name = "AiOutputError"
    this.issues = issues
  }
}
