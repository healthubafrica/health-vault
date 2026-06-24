import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

const REFRESH_MAX_AGE = 604800
const ACCESS_MAX_AGE = 900

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.userId || !body?.otp) {
    return NextResponse.json({ message: 'userId and otp are required' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${BACKEND}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: body.userId, otp: body.otp }),
    })
  } catch {
    return NextResponse.json({ message: 'API unavailable' }, { status: 503 })
  }

  const data = await upstream.json().catch(() => ({}))

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }

  const { accessToken, refreshToken } = data as { accessToken: string; refreshToken: string }

  const cookieStore = await cookies()

  cookieStore.set('hha_at', accessToken, {
    maxAge: ACCESS_MAX_AGE,
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  })

  cookieStore.set('hha_rt', refreshToken, {
    maxAge: REFRESH_MAX_AGE,
    path: '/api/auth/refresh',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })

  return NextResponse.json({ accessToken })
}
