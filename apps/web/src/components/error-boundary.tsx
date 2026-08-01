import { Component, type ReactNode, type ErrorInfo } from "react"
import { Button } from "@workspace/ui/components/button"
import { createLogger } from "@workspace/logger/browser"

const logger = createLogger("error-boundary")

type Props = { children: ReactNode; fallback?: ReactNode }
type State = { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(error, "ErrorBoundary caught")
    logger.error(
      { componentStack: info.componentStack },
      "ErrorBoundary details"
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred"}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
