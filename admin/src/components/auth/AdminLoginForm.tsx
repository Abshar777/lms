'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Shield } from 'lucide-react'
import { api } from '@/lib/axios'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type Values = z.infer<typeof schema>

const fieldVariant = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24, delay: i * 0.07 } }),
}

export function AdminLoginForm() {
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Values) => {
    setError(null)
    try {
      await api.post('/auth/login', { email: data.email, password: data.password })
      document.cookie = `learnos_admin_auth=demo; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      window.location.href = '/'
    } catch (err: any) {
      const status = err?.response?.status
      const msg    = err?.response?.data?.error?.message
      if (status === 401 || status === 400) {
        setError(msg ?? 'Invalid credentials.')
        return
      }
      // Backend not running — demo mode
      if (data.email !== 'admin@learnos.com') {
        setError('Demo mode: use admin@learnos.com with any password.')
        return
      }
      document.cookie = `learnos_admin_auth=demo; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      window.location.href = '/'
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2"
        style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.24)' }}
      >
        <Shield size={14} color="#FF6B1A" strokeWidth={2} />
        <span className="text-xs font-semibold" style={{ color: '#FF6B1A' }}>Admin Access Only</span>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mb-8"
      >
        <h1
          className="mb-2 text-[32px] font-bold leading-tight tracking-tight text-white"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          Welcome back
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          Sign in to your admin portal
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <motion.div custom={0} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Email address
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: errors.email ? '#EF4444' : 'rgba(255,255,255,0.3)' }} />
            <input
              {...register('email')}
              type="email"
              placeholder="admin@learnos.com"
              className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-white/25"
              style={{
                background: errors.email ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              }}
              onFocus={e => { e.currentTarget.style.border = '1.5px solid rgba(255,107,26,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.border = `1.5px solid ${errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}` ; e.currentTarget.style.background = errors.email ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
                <AlertCircle size={11} />{errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div custom={1} variants={fieldVariant} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: errors.password ? '#EF4444' : 'rgba(255,255,255,0.3)' }} />
            <input
              {...register('password')}
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              className="w-full rounded-xl py-3 pl-10 pr-11 text-sm text-white outline-none transition-all placeholder:text-white/25"
              style={{
                background: errors.password ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
              }}
              onFocus={e => { e.currentTarget.style.border = '1.5px solid rgba(255,107,26,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,26,0.12)' }}
              onBlur={e => { e.currentTarget.style.border = `1.5px solid ${errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`; e.currentTarget.style.background = errors.password ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: 'rgba(255,255,255,0.3)' }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
                <AlertCircle size={11} />{errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}>
              <AlertCircle size={15} />{error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.div custom={2} variants={fieldVariant} initial="hidden" animate="visible">
          <motion.button type="submit" disabled={isSubmitting}
            whileHover={{ y: -2, boxShadow: '0 10px 32px rgba(255,107,26,0.42)' }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)', boxShadow: '0 4px 24px rgba(255,107,26,0.32)' }}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : <>Sign in to Admin<ArrowRight size={16} /></>}
          </motion.button>
        </motion.div>
      </form>

      <motion.p custom={3} variants={fieldVariant} initial="hidden" animate="visible"
        className="mt-6 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Demo: admin@learnos.com · any password
      </motion.p>
    </div>
  )
}
