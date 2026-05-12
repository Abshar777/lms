import { NextRequest, NextResponse } from 'next/server'

// Paths that require authentication — includes root (the dashboard)
const PROTECTED_PREFIXES = ['/', '/courses', '/my-learning', '/profile', '/settings', '/achievements']

// Paths only for guests (redirect logged-in users away)
const GUEST_ONLY = ['/login', '/register']

// Auth API routes — never redirect these
const PUBLIC_API_PREFIXES = ['/api/']

function isAuthenticated(req: NextRequest): boolean {
  return !!(
    req.cookies.get('learnos_auth')?.value ||
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authed = isAuthenticated(req)

  // Never touch API routes
  if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Guest-only routes → bounce to dashboard if already logged in
  const isGuestOnly = GUEST_ONLY.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (isGuestOnly && authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Protected routes → bounce to login if not authenticated
  const isProtected = PROTECTED_PREFIXES.some(p =>
    p === '/' ? pathname === '/' || !GUEST_ONLY.some(g => pathname.startsWith(g))
              : pathname === p || pathname.startsWith(p + '/')
  )
  // Simpler: everything that's not a guest-only page requires auth
  if (!isGuestOnly && !authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
