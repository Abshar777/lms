'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight,
  Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { api } from '@/lib/axios'

/* ─── Validation ────────────────────────────────── */
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type RegisterValues = z.infer<typeof registerSchema>

/* ─── Password strength ─────────────────────────── */
function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const map = [
    { label: '', color: '#E4E7ED' },
    { label: 'Weak', color: '#EF4444' },
    { label: 'Fair', color: '#F59E0B' },
    { label: 'Good', color: '#2F6BFF' },
    { label: 'Strong', color: '#0ECC8E' },
  ]
  return { score, ...map[score] }
}

/* ─── Field animation ───────────────────────────── */
const fieldVariant = {
  hidden: { opacity: 0, x: 12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24, delay: i * 0.055 },
  }),
}

/* ─── Styled input helper ───────────────────────── */
function InputField({
  icon: Icon,
  error,
  rightEl,
  ...props
}: {
  icon: React.ElementType
  error?: boolean
  rightEl?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2"
        style={{ color: error ? '#EF4444' : '#9CA3AF' }}
      />
      <input
        {...props}
        className="w-full rounded-xl py-3 pl-10 pr-11 text-sm outline-none transition-all"
        style={{
          background: error ? '#FEF2F2' : '#F4F5F8',
          border: `1.5px solid ${error ? '#FCA5A5' : 'transparent'}`,
          color: '#0D0F1A',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onFocus={e => {
          e.currentTarget.style.border = `1.5px solid ${error ? '#EF4444' : '#2F6BFF'}`
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.boxShadow = error
            ? '0 0 0 3px rgba(239,68,68,0.12)'
            : '0 0 0 3px rgba(47,107,255,0.12)'
        }}
        onBlur={e => {
          e.currentTarget.style.border = `1.5px solid ${error ? '#FCA5A5' : 'transparent'}`
          e.currentTarget.style.background = error ? '#FEF2F2' : '#F4F5F8'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {rightEl && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightEl}</div>
      )}
    </div>
  )
}

interface RegisterFormProps {
  onSwitch: () => void
}

export function RegisterForm({ onSwitch }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const watchedPassword = watch('password', '')
  const strength = getStrength(watchedPassword)

  const onSubmit = async (data: RegisterValues) => {
    setServerError(null)
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      })
      // Backend sets httpOnly lms_at + lms_rt cookies on success
      window.location.href = '/my-learning'
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      setServerError(msg ?? 'Unable to create your account. Please try again.')
    }
  }

  return (
    <motion.div
      key="register"
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
        className="mb-7"
      >
        <p className="mb-1 text-sm font-medium" style={{ color: '#FF6B1A' }}>
          Start for free ✨
        </p>
        <h2
          className="text-[28px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: '#0D0F1A' }}
        >
          Create your account
        </h2>
        <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>
          Join 24,000+ learners already on LearnOS.
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
        {/* Full name */}
        <motion.div custom={2} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Full name
          </label>
          <InputField
            {...register('name')}
            icon={User}
            error={!!errors.name}
            type="text"
            placeholder="Cecillia Funi"
            autoComplete="name"
          />
          <AnimatePresence>
            {errors.name && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}
              >
                <AlertCircle size={11} /> {errors.name.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Email */}
        <motion.div custom={3} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Email address
          </label>
          <InputField
            {...register('email')}
            icon={Mail}
            error={!!errors.email}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}
              >
                <AlertCircle size={11} /> {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div custom={4} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Password
          </label>
          <InputField
            {...register('password')}
            icon={Lock}
            error={!!errors.password}
            type={showPassword ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            rightEl={
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="transition-opacity hover:opacity-70"
                style={{ color: '#9CA3AF' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {/* Password strength bar */}
          <AnimatePresence>
            {watchedPassword.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#F0F1F5' }}>
                      <motion.div
                        className="h-full rounded-full"
                        animate={{ width: strength.score >= i ? '100%' : '0%' }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{ background: strength.color }}
                      />
                    </div>
                  ))}
                  <span className="text-[11px] font-medium w-12" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}
              >
                <AlertCircle size={11} /> {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Confirm password */}
        <motion.div custom={5} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>
            Confirm password
          </label>
          <InputField
            {...register('confirmPassword')}
            icon={Lock}
            error={!!errors.confirmPassword}
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repeat your password"
            autoComplete="new-password"
            rightEl={
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="transition-opacity hover:opacity-70"
                style={{ color: '#9CA3AF' }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <AnimatePresence>
            {errors.confirmPassword && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}
              >
                <AlertCircle size={11} /> {errors.confirmPassword.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Terms */}
        <motion.p
          custom={6}
          variants={fieldVariant}
          initial="hidden"
          animate="visible"
          className="text-xs leading-relaxed"
          style={{ color: '#9CA3AF' }}
        >
          By creating an account, you agree to our{' '}
          <span className="font-medium cursor-pointer" style={{ color: '#2F6BFF' }}>Terms of Service</span>
          {' '}and{' '}
          <span className="font-medium cursor-pointer" style={{ color: '#2F6BFF' }}>Privacy Policy</span>.
        </motion.p>

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
        <motion.div custom={7} variants={fieldVariant} initial="hidden" animate="visible">
          <motion.button
            type="submit"
            disabled={isSubmitting}
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
                Creating account…
              </>
            ) : (
              <>
                Create free account
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </motion.div>
      </form>

      {/* Switch to login */}
      <motion.p
        custom={8}
        variants={fieldVariant}
        initial="hidden"
        animate="visible"
        className="mt-5 text-center text-sm"
        style={{ color: '#6B7280' }}
      >
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#FF6B1A' }}
        >
          Sign in →
        </button>
      </motion.p>
    </motion.div>
  )
}

