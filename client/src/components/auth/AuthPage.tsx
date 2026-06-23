'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthHeroPanel } from './AuthHeroPanel'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

type AuthMode = 'login' | 'register'

interface AuthPageProps {
  initialMode: AuthMode
}

/* ─── Step indicator dots ───────────────────────── */
function StepDots({ mode }: { mode: AuthMode }) {
  return (
    <div className="flex items-center gap-1.5">
      {(['login', 'register'] as const).map(m => (
        <motion.div
          key={m}
          animate={{ width: mode === m ? 20 : 6, opacity: mode === m ? 1 : 0.3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="h-1.5 rounded-full"
          style={{ background: '#0057b8' }}
        />
      ))}
    </div>
  )
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)

  const switchMode = (next: AuthMode) => {
    setMode(next)
    window.history.replaceState(null, '', next === 'login' ? '/login' : '/register')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ══ LEFT — Delta hero panel (55%) ══ */}
      <motion.div
        className="relative hidden h-full lg:flex"
        style={{ width: '55%', flexShrink: 0 }}
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 28, delay: 0.05 }}
      >
        <AuthHeroPanel />
      </motion.div>

      {/* ══ RIGHT — Form panel (45%) ══ */}
      <motion.div
        className="relative flex h-full w-full flex-col overflow-y-auto lg:w-[45%]"
        style={{ background: '#FFFFFF' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {/* Subtle inner shadow on left edge */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 hidden lg:block"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.06), transparent)' }}
        />

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6 lg:px-12">
          {/* Mobile logo */}
          <div className="flex items-center lg:opacity-0 lg:pointer-events-none">
            <img
              src="/logo.webp"
              alt="Delta Institutions"
              style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Mode toggle pill */}
          <div
            className="flex items-center gap-1 rounded-full p-1"
            style={{ background: '#F4F5F8' }}
          >
            {(['login', 'register'] as const).map(m => (
              <motion.button
                key={m}
                onClick={() => switchMode(m)}
                className="relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                style={{ color: mode === m ? '#0D0F1A' : '#9CA3AF' }}
              >
                {mode === m && (
                  <motion.span
                    layoutId="pill-bg"
                    className="absolute inset-0 rounded-full"
                    style={{ background: '#FFFFFF', boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {m === 'login' ? 'Sign in' : 'Sign up'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-8 py-6 lg:px-12">
          <div className="w-full" style={{ maxWidth: mode === 'register' ? 560 : 400 }}>
            {/* Step dots — only for login */}
            {mode === 'login' && (
              <div className="mb-6 flex items-center justify-between">
                <StepDots mode={mode} />
                <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                  Step 1 of 1
                </span>
              </div>
            )}

            {/* Animated form switch */}
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <LoginForm key="login" onSwitch={() => switchMode('register')} />
              ) : (
                <RegisterForm key="register" onSwitch={() => switchMode('login')} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 lg:px-12">
          <p className="text-center text-xs" style={{ color: '#D1D5DB' }}>
            © {new Date().getFullYear()} Delta Institutions · All rights reserved ·{' '}
            <span className="cursor-pointer hover:text-gray-400 transition-colors">Privacy</span>
            {' · '}
            <span className="cursor-pointer hover:text-gray-400 transition-colors">Terms</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
