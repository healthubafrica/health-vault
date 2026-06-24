'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { Monitor, Trash2 } from 'lucide-react'
import { auth, type Session } from '@/lib/api'

export function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [signingOutAll, setSigningOutAll] = useState(false)

  const load = () => {
    setLoading(true)
    auth
      .listSessions()
      .then((res) => setSessions(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load sessions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this session? Devices using it will need to sign in again.')) return
    setRevoking(id)
    try {
      await auth.revokeSession(id)
      setSessions((s) => s.filter((x) => x.id !== id))
      toast.success('Session revoked')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke session')
    } finally {
      setRevoking(null)
    }
  }

  const handleSignOutAll = async () => {
    if (!window.confirm('Sign out of every other device? You will stay signed in here.')) return
    setSigningOutAll(true)
    try {
      await auth.logoutAll()
      toast.success('Signed out of all other devices')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out everywhere')
    } finally {
      setSigningOutAll(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="mb-0">Active sessions</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSignOutAll}
          loading={signingOutAll}
          disabled={sessions.length <= 1}
        >
          Sign out other devices
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <SkeletonBox className="h-16 rounded-xl" />
          <SkeletonBox className="h-16 rounded-xl" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
          No active sessions.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
            >
              <Monitor className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                  {summariseUserAgent(s.userAgent)}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {s.ipAddress ? `${s.ipAddress} · ` : ''}signed in {formatDate(s.createdAt)} · expires {formatDate(s.expiresAt)}
                </p>
              </div>
              <Pill variant="success">Active</Pill>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(s.id)}
                loading={revoking === s.id}
                aria-label="Revoke session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function summariseUserAgent(ua: string | undefined): string {
  if (!ua) return 'Unknown device'
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari'
  return ua.slice(0, 40)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
