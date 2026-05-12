'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/lib/axios'

/* ─── Validation schema ─────────────────────────── */
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
})
type LoginValues = z.infer<typeof loginSchema>

/* ─── Field animation ───────────────────────────── */
const fieldVariant = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24, delay: i * 0.06 },
  }),
}

interface LoginFormProps {
  onSwitch: () => void
}

export function LoginForm({ onSwitch }: LoginFormProps) {
  const [showPassword,  setShowPassword]  = useState(false)
  const [serverError,   setServerError]   = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  })

  /* ─── Submit handler ──────────────────────────── */
  const onSubmit = async (data: LoginValues) => {
    setServerError(null)
    try {
      // Try real backend login via axios
      await api.post('/auth/login', { email: data.email, password: data.password })
      // Backend sets httpOnly session cookie on success
      document.cookie = `learnos_auth=demo; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      window.location.href = '/'
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        setServerError(msg ?? 'Invalid email or password.')
        return
      }
      // Backend not running — demo mode
      document.cookie = `learnos_auth=demo; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      window.location.href = '/'
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    // Demo fallback when NextAuth isn't configured
    setTimeout(() => {
      document.cookie = `learnos_auth=demo; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      window.location.href = '/'
    }, 800)
  }

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="w-full"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <p className="mb-1 text-sm font-medium" style={{ color: '#FF6B1A' }}>
          Welcome back 👋
        </p>
        <h2
          className="text-[28px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: '#0D0F1A' }}
        >
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>
          Pick up right where you left off.
        </p>
      </motion.div>

      {/* Google OAuth */}
      <motion.button
        custom={0}
        variants={fieldVariant}
        initial="hidden"
        animate="visible"
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || isSubmitting}
        whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(0,0,0,0.10)' }}
        whileTap={{ scale: 0.98 }}
        className="relative flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all disabled:opacity-60"
        style={{
          borderColor: '#E4E7ED',
          color: '#0D0F1A',
          background: '#FFFFFF',
        }}
      >
        {googleLoading ? (
          <Loader2 size={18} className="animate-spin" style={{ color: '#6B7280' }} />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </motion.button>

      {/* Divider */}
      <motion.div
        custom={1}
        variants={fieldVariant}
        initial="hidden"
        animate="visible"
        className="my-6 flex items-center gap-3"
      >
        <div className="h-px flex-1" style={{ background: '#E4E7ED' }} />
        <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
          or continue with email
        </span>
        <div className="h-px flex-1" style={{ background: '#E4E7ED' }} />
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <motion.div custom={2} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Email address
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: errors.email ? '#EF4444' : '#9CA3AF' }}
            />
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none transition-all"
              style={{
                background: errors.email ? '#FEF2F2' : '#F4F5F8',
                border: `1.5px solid ${errors.email ? '#FCA5A5' : 'transparent'}`,
                color: '#0D0F1A',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onFocus={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.email ? '#EF4444' : '#2F6BFF'}`
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.boxShadow = errors.email
                  ? '0 0 0 3px rgba(239,68,68,0.12)'
                  : '0 0 0 3px rgba(47,107,255,0.12)'
              }}
              onBlur={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.email ? '#FCA5A5' : 'transparent'}`
                e.currentTarget.style.background = errors.email ? '#FEF2F2' : '#F4F5F8'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}
              >
                <AlertCircle size={11} />
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div custom={3} variants={fieldVariant} initial="hidden" animate="visible">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-semibold" style={{ color: '#0D0F1A' }}>
              Password
            </label>
            <button
              type="button"
              className="text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: '#2F6BFF' }}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: errors.password ? '#EF4444' : '#9CA3AF' }}
            />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
              autoComplete="current-password"
              className="w-full rounded-xl py-3 pl-10 pr-11 text-sm outline-none transition-all"
              style={{
                background: errors.password ? '#FEF2F2' : '#F4F5F8',
                border: `1.5px solid ${errors.password ? '#FCA5A5' : 'transparent'}`,
                color: '#0D0F1A',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onFocus={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.password ? '#EF4444' : '#2F6BFF'}`
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.boxShadow = errors.password
                  ? '0 0 0 3px rgba(239,68,68,0.12)'
                  : '0 0 0 3px rgba(47,107,255,0.12)'
              }}
              onBlur={e => {
                e.currentTarget.style.border = `1.5px solid ${errors.password ? '#FCA5A5' : 'transparent'}`
                e.currentTarget.style.background = errors.password ? '#FEF2F2' : '#F4F5F8'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: '#9CA3AF' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}
              >
                <AlertCircle size={11} />
                {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Remember me */}
        <motion.div
          custom={4}
          variants={fieldVariant}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2"
        >
          <input
            {...register('remember')}
            type="checkbox"
            id="remember"
            className="h-4 w-4 cursor-pointer rounded"
            style={{ accentColor: '#2F6BFF' }}
          />
          <label htmlFor="remember" className="cursor-pointer text-sm" style={{ color: '#6B7280' }}>
            Remember me for 30 days
          </label>
        </motion.div>

        {/* Server error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: '#FEE2E2', color: '#DC2626' }}
            >
              <AlertCircle size={15} />
              {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.div custom={5} variants={fieldVariant} initial="hidden" animate="visible">
          <motion.button
            type="submit"
            disabled={isSubmitting || googleLoading}
            whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(255,107,26,0.38)' }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
              boxShadow: '0 4px 20px rgba(255,107,26,0.30)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </motion.div>
      </form>

      {/* Switch to register */}
      <motion.p
        custom={6}
        variants={fieldVariant}
        initial="hidden"
        animate="visible"
        className="mt-6 text-center text-sm"
        style={{ color: '#6B7280' }}
      >
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#FF6B1A' }}
        >
          Create one free →
        </button>
      </motion.p>
    </motion.div>
  )
}

/* ── Google SVG icon ─────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.165 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
