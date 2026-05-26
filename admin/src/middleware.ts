import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Admin middleware — cookie-based auth guard.
 *
 * The backend sets an httpOnly `lms_at` cookie on login/refresh.
 * Middleware only checks presence (not validity — that's the API's job).
 * Protected pages → redirect to /login when cookie is absent.
 * /login → redirect to / when cookie is present (already signed in).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  /* Never touch API or Next internals — let route handlers deal with them */
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const hasToken = !!req.cookies.get('lms_at')?.value

  /* Already logged-in users visiting /login → dashboard */
  if (pathname === '/login' && hasToken) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  /* Unauthenticated users visiting any protected route → login */
  if (pathname !== '/login' && !hasToken) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
