import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { LAB_RESULTS } from '@/lib/data/labs'
import { FlaskConical } from 'lucide-react'

export function LabsPanel() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Quick Results
      </p>

      <div className="flex flex-col gap-2">
        {LAB_RESULTS.map(lab => (
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

      <Button size="sm" fullWidth><FlaskConical size={13} />Book CareTest™</Button>
    </div>
  )
}
