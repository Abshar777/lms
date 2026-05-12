import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',   // root layout template appends "— LearnOS"
  description: 'Sign in or create your LearnOS account',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen w-full overflow-hidden">
      {children}
    </main>
  )
}
