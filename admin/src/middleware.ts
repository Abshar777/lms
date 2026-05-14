import { NextRequest, NextResponse } from 'next/server'

const ACCESS_COOKIE = 'lms_at'
const GUEST_ONLY = ['/login']

function isAuthenticated(req: NextRequest): boolean {
  return !!req.cookies.get(ACCESS_COOKIE)?.value
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authed = isAuthenticated(req)

  // Never touch API / static routes
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Guest-only: redirect logged-in admins away from /login
  const isGuestOnly = GUEST_ONLY.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (isGuestOnly && authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Everything else requires auth
  if (!isGuestOnly && !authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
