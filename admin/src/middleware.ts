import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    /* Logged-in admin trying to visit /login → redirect to dashboard */
    if (pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      /* Return true to allow the request; false forces redirect to signIn page */
      authorized({ token, req }) {
        const { pathname } = req.nextUrl

        /* /login is always accessible */
        if (pathname === '/login') return true

        /* Everything else requires a valid NextAuth session */
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  },
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
