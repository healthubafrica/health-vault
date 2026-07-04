import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// SEC-002: token is stored in 'hha_at' cookie by lib/api.ts saveTokens()
const ACCESS_COOKIE = 'hha_at'

const PUBLIC_PATHS = [
  '/login',
  '/onboarding',
  '/payments/verify',
  '/share',
  '/_next',
  '/favicon.ico',
  '/logo-white.png',
  '/auth-bg.png',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // SEC-002: read the access token from the cookie written at login.
  // The cookie is SameSite=Strict so it is never sent in cross-origin requests.
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
