import { Router } from 'express'
import { z } from 'zod'
import { AuthController } from '@/controllers/auth.controller.ts'
import { validate } from '@/middleware/validate.middleware.ts'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { authRateLimit } from '@/middleware/rateLimit.middleware.ts'
import totpRoutes from './totp.routes.ts'

const router = Router()
const auth   = new AuthController()

/* ─── Zod schemas ────────────────────────────────── */
const enrollmentAppSchema = z.object({
  phone:              z.string().max(30).optional(),
  emergencyContact:   z.string().max(30).optional(),
  gender:             z.enum(['Male', 'Female', 'Prefer not to say']).optional(),
  dateOfBirth:        z.string().optional(),
  nationality:        z.string().max(80).optional(),
  homeCountry:        z.string().max(80).optional(),
  occupation:         z.string().max(120).optional(),
  idType:             z.string().max(40).optional(),
  idNumber:           z.string().max(40).optional(),
  emiratesId:         z.string().max(20).optional(),
  countryAttendance:  z.string().max(80).optional(),
  villa:              z.string().max(120).optional(),
  city:               z.string().max(80).optional(),
  addressCountry:     z.string().max(80).optional(),
  passportUrl:        z.string().url().optional().or(z.literal('')),
  idDocUrl:           z.string().url().optional().or(z.literal('')),
  photoUrl:           z.string().url().optional().or(z.literal('')),
  experienceLevel:    z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  preferredStartDate: z.string().optional(),
  hearAboutUs:        z.string().max(80).optional(),
  referralName:       z.string().max(120).optional(),
  programs:           z.array(z.string().max(120)).optional(),
  paymentMethod:      z.string().max(50).optional(),
}).optional()

const registerSchema = z.object({
  name:     z.string().min(2).max(120).trim(),
  email:    z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  enrollmentApplication: enrollmentAppSchema,
})

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

/* ─── Reset / verify schemas ─────────────────────── */
const forgotSchema = z.object({
  email: z.string().email().toLowerCase(),
})
const resetSchema = z.object({
  token:    z.string().min(32),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})
const verifySchema = z.object({
  token: z.string().min(32),
})

/* ─── Routes ─────────────────────────────────────── */

// Public
router.post('/register',         authRateLimit, validate(registerSchema), auth.register)
router.post('/login',            authRateLimit, validate(loginSchema),    auth.login)
router.post('/refresh',          authRateLimit, auth.refresh)
router.post('/logout',           authRateLimit, auth.logout)
router.post('/forgot-password',  authRateLimit, validate(forgotSchema),   auth.forgotPassword)
router.post('/reset-password',   authRateLimit, validate(resetSchema),    auth.resetPassword)
router.post('/verify-email',     authRateLimit, validate(verifySchema),   auth.verifyEmail)

/* ─── Profile update DTO ─────────────────────────── */
const updateMeSchema = z.object({
  name:       z.string().min(2).max(120).trim().optional(),
  headline:   z.string().max(255).optional(),
  bio:        z.string().max(2000).optional(),
  avatarUrl:  z.string().url().or(z.literal('')).optional(),
  websiteUrl: z.string().url().or(z.literal('')).optional(),
})

/* Enrollment docs update (passport + id doc + photo URLs after upload) */
const enrollmentDocsSchema = z.object({
  passportUrl: z.string().url().optional().or(z.literal('')),
  idDocUrl:    z.string().url().optional().or(z.literal('')),
  photoUrl:    z.string().url().optional().or(z.literal('')),
})

/* Re-auth schema used by deactivate + delete */
const reauthSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})

// Protected
/* ── 2FA sub-router ── */
router.use('/2fa', totpRoutes)

router.post  ('/logout-all',          authenticate, auth.logoutAll)
router.get   ('/me',                  authenticate, auth.me)
router.patch ('/me',                  authenticate, validate(updateMeSchema), auth.updateMe)
router.patch ('/me/enrollment-docs',  authenticate, validate(enrollmentDocsSchema), auth.updateEnrollmentDocs)
router.patch ('/me/password',         authenticate, validate(changePasswordSchema), auth.changePassword)
router.post  ('/resend-verification', authenticate, auth.resendVerification)
router.get   ('/sessions',            authenticate, auth.listSessions)
router.delete('/sessions/:id',        authenticate, auth.revokeSession)
router.post  ('/deactivate',          authenticate, validate(reauthSchema), auth.deactivateAccount)
router.delete('/account',             authenticate, validate(reauthSchema), auth.deleteAccount)

export default router
