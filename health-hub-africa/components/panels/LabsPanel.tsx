'use client'

import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { labs } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { FlaskConical } from 'lucide-react'

export function LabsPanel() {
  const { data: labsRes } = useApi(() => labs.listOrders())
  const allOrders = labsRes?.data ?? []

  const results = allOrders.flatMap((order) =>
    order.results.map((r) => ({
      id: `${order.id}-${r.id}`,
      test: r.testName,
      status: r.isFlagged ? 'flagged' : 'normal',
      value: [r.valueDisplay, r.unit].filter(Boolean).join(' '),
    }))
  )

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Quick Results
      </p>

      {results.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No lab results yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.slice(0, 5).map(lab => (
            <div
              key={lab.id}
              className="flex items-center gap-2.5 p-3 rounded-xl border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <FlaskConical size={14} style={{ color: lab.status === 'normal' ? '#6DC43F' : 'var(--color-warning)' }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{lab.test}</p>
                {lab.value && <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{lab.value}</p>}
              </div>
              <Pill variant={lab.status === 'normal' ? 'success' : 'warning'}>{lab.status}</Pill>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" fullWidth><FlaskConical size={13} />Book CareTest™</Button>
    </div>
  )
}
