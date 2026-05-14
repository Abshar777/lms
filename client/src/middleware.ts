import { NextRequest, NextResponse } from 'next/server'

const ACCESS_COOKIE = 'lms_at'
/* Guest-only: signed-in users get bounced away from these */
const GUEST_ONLY = ['/login', '/register']
/* Public: anyone can visit. Used for password reset / email
   verification flows that need to work whether or not the user
   is signed in (links arrive via email). */
const PUBLIC = ['/forgot-password', '/reset-password', '/verify-email']

function isAuthenticated(req: NextRequest): boolean {
  return !!req.cookies.get(ACCESS_COOKIE)?.value
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authed = isAuthenticated(req)

  // Never touch API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Public routes — let everyone through, no redirects either way
  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Guest-only routes → bounce to My Learning if already signed in
  const isGuestOnly = GUEST_ONLY.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (isGuestOnly && authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/my-learning'
    return NextResponse.redirect(url)
  }

  // Everything else requires auth
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
