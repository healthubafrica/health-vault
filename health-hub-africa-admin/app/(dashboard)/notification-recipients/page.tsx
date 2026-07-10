'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminApi, type NotificationRecipient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { Button } from '@/components/ui/Button'
import { FormInput } from '@/components/ui/FormInput'
import { SkeletonBox } from '@/components/ui/Skeleton'
import { RefreshCw, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function NotificationRecipientsPage() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.notificationRecipients.list()
      setRecipients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification recipients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !email.trim()) return
    setAdding(true)
    try {
      await adminApi.notificationRecipients.create(label.trim(), email.trim())
      setLabel('')
      setEmail('')
      toast.success('Recipient added')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add recipient')
    } finally {
      setAdding(false)
    }
  }, [label, email, load])

  const handleToggleActive = useCallback(async (r: NotificationRecipient) => {
    try {
      await adminApi.notificationRecipients.update(r.id, { isActive: !r.isActive })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update recipient')
    }
  }, [load])

  const handleRemove = useCallback(async (id: string) => {
    setRemovingId(id)
    try {
      await adminApi.notificationRecipients.remove(id)
      toast.success('Recipient removed')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove recipient')
    } finally {
      setRemovingId(null)
    }
  }, [load])

  return (
    <div className="max-w-[800px]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Notification Recipients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Everyone in this list gets an email for every appointment created, confirmed, cancelled,
            rescheduled, completed, or missed — platform-wide.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-emergency)' }}>
          {error}
        </div>
      )}

      <Card className="mb-5">
        <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
              Label
            </label>
            <FormInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Front Desk"
            />
          </div>
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--color-text-muted)' }}>
              Email
            </label>
            <FormInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="frontdesk@healthhubafrica.com"
            />
          </div>
          <Button type="submit" loading={adding} disabled={!label.trim() || !email.trim()}>
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </form>
      </Card>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Label', 'Email', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <SkeletonBox height={14} className="rounded" style={{ width: j === 1 ? 180 : 90 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recipients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No recipients configured yet
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{r.label}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>{r.email}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleActive(r)}>
                        <Pill variant={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</Pill>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={removingId === r.id}
                        onClick={() => handleRemove(r.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
