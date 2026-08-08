import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  signupSchema,
  type SignupInput,
} from "@workspace/schemas/validations/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AuthShell } from "@/components/auth-shell"
import { signUp } from "@/lib/auth-client"

export function SignupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(data: SignupInput) {
    setError(null)
    setLoading(true)
    try {
      const result = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      if (result.error) {
        setError(
          result.error.message ?? result.error.statusText ?? "Signup failed"
        )
        return
      }
      navigate("/verify-email")
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create account"
      description="Fill in the details to get started"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="name"
            className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
          >
            Name
          </Label>
          <Input
            id="name"
            placeholder="John Doe"
            className="h-10.5 rounded-[10px] border-input bg-background"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

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
            placeholder="you@example.com"
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

        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="font-mono text-[11.5px] font-medium tracking-[0.1em] text-foreground/80 uppercase"
          >
            Confirm password
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
            {loading ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
