import { z } from 'zod'

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
