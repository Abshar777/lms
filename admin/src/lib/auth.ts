import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXTAUTH_URL_INTERNAL ?? ''
  if (!raw) return 'http://localhost:4000/api/v1'
  let v = raw.trim().replace(/\/+$/, '')
  if (!v.includes('/api/')) v = `${v}/api/v1`
  return v
}

const API_BASE = resolveApiBase()

interface BackendLoginResponse {
  success: true
  data: {
    user: {
      id:        string
      name:      string
      email:     string
      role:      string
      avatarUrl: string | null
    }
  }
}

/* The backend sets tokens as httpOnly cookies, not in the JSON body.
   This helper extracts the raw JWT value from a Set-Cookie header string. */
function extractCookie(setCookieHeaders: string[] | string | undefined, name: string): string {
  const headers = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders ? [setCookieHeaders] : []
  const match = headers.find(h => h.startsWith(`${name}=`))
  return match?.split(';')[0]?.replace(`${name}=`, '') ?? ''
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await axios.post<BackendLoginResponse>(
            `${API_BASE}/auth/login`,
            { email: credentials.email, password: credentials.password },
            { timeout: 10_000 },
          )

          const { user } = res.data.data

          /* Admin-only portal — reject any non-admin account */
          if (user.role !== 'admin') {
            throw new Error('NOT_ADMIN')
          }

          /* Tokens arrive as Set-Cookie headers, not in the JSON body */
          const setCookieHeaders = res.headers['set-cookie']
          const accessToken = extractCookie(setCookieHeaders, 'lms_at')

          if (!accessToken) throw new Error('LOGIN_FAILED')

          return {
            id:           user.id,
            name:         user.name,
            email:        user.email,
            image:        user.avatarUrl ?? undefined,
            role:         user.role,
            backendToken: accessToken,
          }
        } catch (err: any) {
          const code    = err?.response?.data?.error?.code
          const message = err?.response?.data?.error?.message

          if (err.message === 'NOT_ADMIN') throw new Error('NOT_ADMIN')
          if (code === 'INVALID_CREDENTIALS') throw new Error('INVALID_CREDENTIALS')
          if (message) throw new Error(message)
          throw new Error('LOGIN_FAILED')
        }
      },
    }),
  ],

  /* ── JWT strategy — session stored in a signed cookie ────────
     The backendToken travels encrypted inside the NextAuth JWT.
     It never touches localStorage or a client-readable cookie.  */
  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user }) {
      /* On first sign-in `user` is populated — persist to JWT */
      if (user) {
        token.id           = user.id
        token.role         = (user as any).role
        token.backendToken = (user as any).backendToken
      }
      return token
    },

    async session({ session, token }) {
      session.user.id           = token.id
      session.user.role         = token.role
      session.user.backendToken = token.backendToken
      if (token.error) session.error = token.error
      return session
    },
  },

  pages: {
    signIn:  '/login',
    error:   '/login',
  },

  /* Suppress NextAuth's default error page — we handle errors in the form */
  debug: process.env.NODE_ENV === 'development',
}
