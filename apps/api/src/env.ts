import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  EMAIL_PROVIDER: z.enum(["console", "mailpit", "resend"]).default("console"),
  MAILPIT_HOST: z.string().optional(),
  MAILPIT_SMTP_PORT: z.coerce.number().optional(),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("template"),
  S3_BASE_URL: z.string().optional(),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error(
      "Invalid environment variables:",
      result.error.flatten().fieldErrors
    )
    process.exit(1)
  }
  return result.data
}

export type Env = z.infer<typeof envSchema>
