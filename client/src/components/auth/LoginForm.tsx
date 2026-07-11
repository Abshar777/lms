'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { api } from '@/lib/axios'
import Spinner from '@/components/ui/Spinner'

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
  const [showPassword, setShowPassword] = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)

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
      const res = await api.post<{ success: true; data: { user: { role: string } } }>(
        '/auth/login',
        { email: data.email, password: data.password },
      )
      // Backend sets httpOnly lms_at + lms_rt cookies on success.
      // Block admin/instructor accounts — they should use the admin panel.
      const role = res.data?.data?.user?.role
      if (role === 'admin' || role === 'instructor') {
        // Clear the cookie we just set
        await api.post('/auth/logout').catch(() => {})
        setServerError('This is the student portal. Please sign in at the admin panel instead.')
        return
      }
      // Clear any leftover cart from a previous user session before navigating
      localStorage.removeItem('lms-cart')
      const from = new URLSearchParams(window.location.search).get('from')
      window.location.href = from && from.startsWith('/') ? from : '/my-learning'
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      setServerError(msg ?? 'Unable to sign in. Please try again.')
    }
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
        <p className="mb-1 text-sm font-medium" style={{ color: '#0057b8' }}>
          Welcome back 👋
        </p>
        <h2
          className="text-[28px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-display), sans-serif', color: '#0D0F1A' }}
        >
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>
          Pick up right where you left off.
        </p>
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
                e.currentTarget.style.border = `1.5px solid ${errors.email ? '#EF4444' : 'transparent'}`
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.boxShadow = errors.email
                  ? '0 0 0 3px rgba(239,68,68,0.12)'
                  : '0 0 0 3px rgba(0,87,184,0.12)'
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
            <a
              href="/forgot-password"
              className="text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: '#0057b8' }}
            >
              Forgot password?
            </a>
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
                e.currentTarget.style.border = `1.5px solid ${errors.password ? '#EF4444' : 'transparent'}`
                e.currentTarget.style.background = '#FFFFFF'
                e.currentTarget.style.boxShadow = errors.password
                  ? '0 0 0 3px rgba(239,68,68,0.12)'
                  : '0 0 0 3px rgba(0,87,184,0.12)'
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
            style={{ accentColor: '#0057b8' }}
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
            disabled={isSubmitting}
            whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,87,184,0.35)' }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: '#0057b8',
              boxShadow: '0 4px 20px rgba(0,87,184,0.30)',
            }}
          >
            {isSubmitting ? (
              <>
                <Spinner size={16} />
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
          style={{ color: '#0057b8' }}
        >
          Create one free →
        </button>
      </motion.p>
    </motion.div>
  )
}

