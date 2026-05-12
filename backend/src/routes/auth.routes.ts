import { Router } from 'express'
import { z } from 'zod'
import { AuthController } from '@/controllers/auth.controller.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { authRateLimit } from '@/middleware/rateLimit.middleware.ts'

const router = Router()
const auth   = new AuthController()

/* ─── Zod schemas ────────────────────────────────── */
const registerSchema = z.object({
  name:     z.string().min(2).max(120).trim(),
  email:    z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(),
})

/* ─── Routes ─────────────────────────────────────── */

// Public
router.post('/register',    authRateLimit, validate(registerSchema), auth.register)
router.post('/login',       authRateLimit, validate(loginSchema),    auth.login)
router.post('/refresh',     authRateLimit, validate(refreshSchema),  auth.refresh)
router.post('/logout',      auth.logout)

// Protected
router.post('/logout-all',  authenticate, auth.logoutAll)
router.get('/me',           authenticate, auth.me)

export default router
