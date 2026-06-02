import { Pill } from '@/components/ui/Pill'
import { Brain, Network, Radio } from 'lucide-react'

export function StridePanel() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Phase Status
      </p>

      <div className="flex flex-col gap-3">
        {[
          { icon: Brain, name: 'STRIDE™', status: 'active', pct: 92 },
          { icon: Network, name: 'HPACS™', status: 'active', pct: 78 },
          { icon: Radio, name: 'EFCE™', status: 'beta', pct: 45 },
        ].map(({ icon: Icon, name, status, pct }) => (
          <div key={name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Icon size={13} style={{ color: '#6DC43F' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{pct}%</span>
                <Pill variant={status === 'active' ? 'success' : 'warning'}>{status}</Pill>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: status === 'active' ? '#6DC43F' : '#bb9f58' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
          System Health
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Uptime', value: '99.98%' },
            { label: 'Avg Response', value: '142ms' },
            { label: 'Cases Today', value: '1,247' },
            { label: 'Active Units', value: '38' },
          ].map(stat => (
            <div
              key={stat.label}
              className="p-2.5 rounded-xl border text-center"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <p className="text-base font-bold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                {stat.value}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
