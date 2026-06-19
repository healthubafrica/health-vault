import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'
const ACCESS_MAX_AGE = 900

export async function POST() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('hha_rt')?.value

  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 })
  }

  const upstream = await fetch(`${BACKEND}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-refresh-token': refreshToken,
    },
  })

  if (!upstream.ok) {
    // Refresh failed — clear both cookies
    cookieStore.delete('hha_at')
    cookieStore.delete('hha_rt')
    return NextResponse.json({ message: 'Session expired' }, { status: 401 })
  }

  const data = (await upstream.json()) as { accessToken: string; refreshToken: string }

  // Rotate access token
  cookieStore.set('hha_at', data.accessToken, {
    maxAge: ACCESS_MAX_AGE,
    path: '/',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  })

  // Rotate refresh token (HttpOnly)
  cookieStore.set('hha_rt', data.refreshToken, {
    maxAge: 604800,
    path: '/api/auth/refresh',
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })

  return NextResponse.json({ accessToken: data.accessToken })
}
