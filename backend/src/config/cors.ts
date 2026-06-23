import type { CorsOptions } from 'cors'
import { env } from './env.ts'

const allowedOrigins = [
  env.CLIENT_URL,
  env.ADMIN_URL,
  'http://localhost:3002',
  'http://localhost:3003',
]

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    /* Allow requests with no origin (mobile apps, curl, Postman) */
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
  exposedHeaders: ['X-New-Access-Token'],
}
