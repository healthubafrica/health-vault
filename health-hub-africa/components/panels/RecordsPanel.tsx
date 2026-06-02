import { Button } from '@/components/ui/Button'
import { RECORDS } from '@/lib/data/records'
import { Download, FolderOpen } from 'lucide-react'

export function RecordsPanel() {
  const downloadable = RECORDS.filter(r => r.downloadable)

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Download Centre
      </p>

      <div className="flex flex-col gap-2">
        {downloadable.map(r => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 p-3 rounded-xl border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <FolderOpen size={14} style={{ color: 'var(--color-text-muted)' }} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>{r.title}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{r.type} · PDF</p>
            </div>
            <button
              aria-label={`Download ${r.title}`}
              className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
              style={{ color: '#6DC43F' }}
            >
              <Download size={13} />
            </button>
          </div>
        ))}
      </div>

      <Button size="sm" fullWidth variant="secondary">Download All Records</Button>
    </div>
  )
}
