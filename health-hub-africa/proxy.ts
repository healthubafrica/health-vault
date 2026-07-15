import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Access token cookie (hha_at) is set by the /api/auth/* route handlers.
const ACCESS_COOKIE = 'hha_at'

const PUBLIC_PATHS = [
  '/login',
  '/onboarding',
  '/payments/verify',
  '/share',
  '/api/auth',        // BFF auth route handlers issue the session cookies
  '/_next',
  '/favicon.ico',
  '/logo-white.png',
  '/auth-bg.png',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Presence check only — the API validates the JWT on every call. SameSite=Strict
  // means the cookie is never sent on cross-origin requests.
  const token = request.cookies.get(ACCESS_COOKIE)?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
