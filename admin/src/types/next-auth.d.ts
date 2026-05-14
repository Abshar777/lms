import type { DefaultSession, DefaultUser } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id:           string
      role:         string
      backendToken: string
    } & DefaultSession['user']
    error?: 'TokenExpired'
  }

  interface User extends DefaultUser {
    id:           string
    role:         string
    backendToken: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id:           string
    role:         string
    backendToken: string
    error?:       'TokenExpired'
  }
}
