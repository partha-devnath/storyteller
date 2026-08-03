import { useEffect, useRef, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { AuthShell } from "@/components/auth-shell"
import { verifyEmail } from "@/lib/auth-client"

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")
  const startedRef = useRef(false)
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(token ? "verifying" : "idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || startedRef.current) {
      return
    }
    startedRef.current = true

    verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setError(result.error.message ?? "Verification failed")
          setStatus("error")
          return
        }
        setStatus("success")
        setTimeout(() => navigate("/login"), 2000)
      })
      .catch(() => {
        setError("An unexpected error occurred")
        setStatus("error")
      })
  }, [token, navigate])

  if (status === "verifying") {
    return (
      <AuthShell title="Verify your email">
        <p className="text-muted-foreground">Verifying your email...</p>
      </AuthShell>
    )
  }

  if (status === "success") {
    return (
      <AuthShell title="Email verified!">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Redirecting to login...
          </p>
          <Button onClick={() => navigate("/login")}>Go to login</Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Verify your email">
      <div className="flex flex-col items-center gap-4">
        {token && error ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={() => navigate("/login")}>Back to login</Button>
          </div>
        ) : (
          <p className="max-w-md text-center text-sm text-muted-foreground">
            We sent you a verification link. Check your email and click the link
            to activate your account.
          </p>
        )}

        {!token && (
          <Link
            to="/login"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Back to login
          </Link>
        )}
      </div>
    </AuthShell>
  )
}
