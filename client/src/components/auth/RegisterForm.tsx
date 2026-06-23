'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight,
  Loader2, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/axios'
import { Button, MotionButton } from '@/components/ui/button'

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
function getStrength(pw: string) {
  let score = 0
  if (pw.length >= 8)           score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: '',       color: '#E4E7ED' },
    { label: 'Weak',   color: '#EF4444' },
    { label: 'Fair',   color: '#F59E0B' },
    { label: 'Good',   color: '#2F6BFF' },
    { label: 'Strong', color: '#0ECC8E' },
  ]
  return { score, ...map[score] }
}

/* ─── Field animation ───────────────────────────── */
const fieldVariant = {
  hidden: { opacity: 0, x: 12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24, delay: i * 0.055 },
  }),
}

/* ─── Input helper ──────────────────────────────── */
function InputField({
  icon: Icon, error, rightEl, ...props
}: { icon: React.ElementType; error?: boolean; rightEl?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2"
        style={{ color: error ? '#EF4444' : '#9CA3AF' }} />
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
      {rightEl && <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </div>
  )
}

interface RegisterFormProps {
  onSwitch: () => void
  onStepChange?: (step: number) => void
}

export function RegisterForm({ onSwitch }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [serverError,  setServerError]  = useState<string | null>(null)
  const [submitting,   setSubmitting]   = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const watchedPw = watch('password', '')
  const strength  = getStrength(watchedPw)

  const onSubmit = handleSubmit(async data => {
    setServerError(null)
    setSubmitting(true)
    try {
      await api.post('/auth/register', {
        name:     data.name,
        email:    data.email,
        password: data.password,
      })
      window.location.href = '/my-learning'
    } catch (err: any) {
      setServerError(
        err?.response?.data?.error?.message ?? 'Unable to create your account. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <motion.div
      key="register"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="w-full"
    >
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }} className="mb-7">
        <p className="mb-1 text-sm font-medium" style={{ color: '#FF6B1A' }}>Start for free ✨</p>
        <h2 className="text-[28px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif', color: '#0D0F1A' }}>
          Create your account
        </h2>
        <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>
          Join 24,000+ learners already on LearnOS.
        </p>
      </motion.div>

      <form onSubmit={onSubmit} noValidate className="space-y-3.5">
        {/* Full name */}
        <motion.div custom={2} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>Full name</label>
          <InputField {...register('name')} icon={User} error={!!errors.name}
            type="text" placeholder="Cecillia Funi" autoComplete="name" />
          <AnimatePresence>
            {errors.name && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}>
                <AlertCircle size={11} /> {errors.name.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Email */}
        <motion.div custom={3} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>Email address</label>
          <InputField {...register('email')} icon={Mail} error={!!errors.email}
            type="email" placeholder="you@example.com" autoComplete="email" />
          <AnimatePresence>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}>
                <AlertCircle size={11} /> {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div custom={4} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>Password</label>
          <InputField {...register('password')} icon={Lock} error={!!errors.password}
            type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" autoComplete="new-password"
            rightEl={
              <Button type="button" variant="ghost" size="icon-sm"
                onClick={() => setShowPassword(v => !v)}
                className="transition-opacity hover:opacity-70 text-[#9CA3AF]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            }
          />
          <AnimatePresence>
            {watchedPw.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: '#F0F1F5' }}>
                      <motion.div className="h-full rounded-full"
                        animate={{ width: strength.score >= i ? '100%' : '0%' }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{ background: strength.color }} />
                    </div>
                  ))}
                  <span className="w-12 text-[11px] font-medium" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {errors.password && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}>
                <AlertCircle size={11} /> {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Confirm password */}
        <motion.div custom={5} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: '#0D0F1A' }}>Confirm password</label>
          <InputField {...register('confirmPassword')} icon={Lock} error={!!errors.confirmPassword}
            type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password" autoComplete="new-password"
            rightEl={
              <Button type="button" variant="ghost" size="icon-sm"
                onClick={() => setShowConfirm(v => !v)}
                className="transition-opacity hover:opacity-70 text-[#9CA3AF]">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            }
          />
          <AnimatePresence>
            {errors.confirmPassword && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} className="mt-1.5 flex items-center gap-1 text-xs"
                style={{ color: '#EF4444' }}>
                <AlertCircle size={11} /> {errors.confirmPassword.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Terms */}
        <motion.p custom={6} variants={fieldVariant} initial="hidden" animate="visible"
          className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
          By creating an account, you agree to our{' '}
          <span className="cursor-pointer font-medium" style={{ color: '#2F6BFF' }}>Terms of Service</span>
          {' '}and{' '}
          <span className="cursor-pointer font-medium" style={{ color: '#2F6BFF' }}>Privacy Policy</span>.
        </motion.p>

        {/* Server error */}
        <AnimatePresence>
          {serverError && (
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <AlertCircle size={15} /> {serverError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.div custom={7} variants={fieldVariant} initial="hidden" animate="visible">
          <MotionButton
            type="submit"
            variant="default"
            size="lg"
            disabled={submitting}
            whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(255,107,26,0.38)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> Creating account…</>
              : <>Create free account <ArrowRight size={16} /></>
            }
          </MotionButton>
        </motion.div>
      </form>

      <motion.p custom={8} variants={fieldVariant} initial="hidden" animate="visible"
        className="mt-5 text-center text-sm" style={{ color: '#6B7280' }}>
        Already have an account?{' '}
        <Button type="button" variant="link" onClick={onSwitch}
          className="font-semibold transition-opacity hover:opacity-70 p-0 h-auto text-[#FF6B1A]">
          Sign in →
        </Button>
      </motion.p>
    </motion.div>
  )
}
