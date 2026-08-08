import { useState } from "react"
import { useSearchParams, useNavigate, Link } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@workspace/schemas/validations/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AuthShell } from "@/components/auth-shell"
import { resetPassword } from "@/lib/auth-client"

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: token ?? "", password: "", confirmPassword: "" },
  })

  async function onSubmit(data: ResetPasswordInput) {
    setError(null)
    setLoading(true)
    try {
      const result = await resetPassword({
        newPassword: data.password,
        token: data.token,
      })
      if (result.error) {
        setError(result.error.message ?? "Password reset failed")
        return
      }
      navigate("/login")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        description="This link is invalid or expired."
      >
        <Link
          to="/forgot-password"
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Request a new link
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Reset password" description="Enter your new password">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
          >
            New password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="h-10.5 rounded-[10px] border-input bg-background"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
          >
            Confirm new password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className="h-10.5 rounded-[10px] border-input bg-background"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Resetting..." : "Reset password"}
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
