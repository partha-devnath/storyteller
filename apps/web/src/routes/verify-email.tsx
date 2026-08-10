import { useEffect, useRef, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { AuthShell } from "@/components/auth-shell"
import {
  sendVerificationEmail,
  useSession,
  verifyEmail,
} from "@/lib/auth-client"

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")
  const startedRef = useRef(false)
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(token ? "verifying" : "idle")
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const email = session?.user?.email
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  async function handleResend() {
    if (!email) return
    setResending(true)
    setResendError(null)
    try {
      const result = await sendVerificationEmail({ email })
      if (result.error) {
        setResendError(result.error.message ?? "Failed to resend")
        return
      }
      setResent(true)
    } catch {
      setResendError("An unexpected error occurred")
    } finally {
      setResending(false)
    }
  }

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
          <div className="flex flex-col items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={resending || resent}
            >
              {resending
                ? "Sending..."
                : resent
                  ? "Verification email sent"
                  : "Resend email"}
            </Button>
            {resendError && (
              <p className="text-sm text-destructive">{resendError}</p>
            )}
            <Link
              to="/login"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
