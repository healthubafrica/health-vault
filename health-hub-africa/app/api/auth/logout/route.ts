import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/v1'

export async function POST() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('hha_at')?.value

  if (accessToken) {
    await fetch(`${BACKEND}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => null)
  }

  cookieStore.delete('hha_at')
  cookieStore.delete('hha_rt')

  return NextResponse.json({ ok: true })
}
