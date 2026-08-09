export class AiOutputError extends Error {
  readonly issues?: unknown
  readonly rawOutput?: string

  constructor(message: string, issues?: unknown, rawOutput?: string) {
    super(message)
    this.name = "AiOutputError"
    this.issues = issues
    this.rawOutput = rawOutput
  }
}
