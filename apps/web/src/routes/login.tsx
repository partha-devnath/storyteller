import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  loginSchema,
  type LoginInput,
} from "@workspace/schemas/validations/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AuthShell } from "@/components/auth-shell"
import { signIn } from "@/lib/auth-client"

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(data: LoginInput) {
    setError(null)
    setLoading(true)
    try {
      const result = await signIn.email(data)
      if (result.error) {
        setError(
          result.error.message ?? result.error.statusText ?? "Login failed"
        )
        return
      }
      navigate("/projects")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Sign in" description="Enter your credentials to continue">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            className="h-10.5 rounded-[10px] border-input bg-background"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
          >
            Password
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

        <div className="flex flex-col gap-4 pt-2">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <div className="flex w-full justify-between text-sm">
            <Link
              to="/signup"
              className="text-muted-foreground hover:text-foreground"
            >
              Create account
            </Link>
            <Link
              to="/forgot-password"
              className="text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </form>
    </AuthShell>
  )
}
