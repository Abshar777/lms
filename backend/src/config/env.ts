import { z } from 'zod'

/* Treat empty strings in .env the same as "not set".
   Without this, STRIPE_SECRET_KEY= (blank) fails min(1). */
const opt = (schema: z.ZodString) =>
  z.preprocess(v => (v === '' ? undefined : v), schema.optional())

const envSchema = z.object({
  /* Server */
  NODE_ENV:  z.enum(['development', 'production', 'test']).default('development'),
  PORT:      z.coerce.number().default(4000),

  /* Database */
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

  /* JWT */
  JWT_ACCESS_SECRET:   z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET:  z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  /* CORS */
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL:  z.string().url().default('http://localhost:3001'),

  /* Bcrypt */
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(14).default(12),

  /* Stripe — all optional; blank lines in .env are treated as unset */
  STRIPE_SECRET_KEY:     opt(z.string().min(1)),
  STRIPE_WEBHOOK_SECRET: opt(z.string().min(1)),
  STRIPE_CURRENCY:       z.string().length(3).default('usd'),

  /* Public URL — used to build absolute file URLs for uploaded media */
  BACKEND_PUBLIC_URL: z.string().url().default('http://localhost:4000'),

  /* Cloudflare R2 object storage */
  R2_ACCOUNT_ID:        z.string().min(1, 'R2_ACCOUNT_ID is required'),
  R2_ACCESS_KEY_ID:     z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_BUCKET_NAME:       z.string().default('learnos-media'),
  R2_PUBLIC_URL:        z.string().url('R2_PUBLIC_URL must be a valid URL, e.g. https://pub-xxx.r2.dev'),

  /* AI — Ollama (local LLM) */
  OLLAMA_BASE_URL: z.preprocess(v => (v === '' ? undefined : v), z.string().url().default('http://localhost:11434')),
  OLLAMA_MODEL:    z.preprocess(v => (v === '' ? undefined : v), z.string().default('llama3.2:3b')),

  /* Mux — live streaming */
  MUX_TOKEN_ID:       opt(z.string().min(1)),
  MUX_TOKEN_SECRET:   opt(z.string().min(1)),
  MUX_WEBHOOK_SECRET: opt(z.string().min(1)),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n')
  parsed.error.issues.forEach(issue => {
    console.error(`  • ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

export const env = parsed.data

export type Env = typeof env
