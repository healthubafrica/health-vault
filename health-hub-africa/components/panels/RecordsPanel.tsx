'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { records } from '@/lib/api'
import { useApi } from '@/lib/hooks/useApi'
import { Download, FolderOpen } from 'lucide-react'

export function RecordsPanel() {
  const { data: recordsRes } = useApi(() => records.list())
  const downloadable = (recordsRes?.data ?? []).filter(r => r.isDownloadable && r.fileUrl)

  function handleDownloadAll() {
    if (downloadable.length === 0) return
    downloadable.forEach(r => window.open(r.fileUrl, '_blank', 'noopener,noreferrer'))
    toast.success(`Opening ${downloadable.length} record${downloadable.length > 1 ? 's' : ''}…`)
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Download Centre
      </p>

      {downloadable.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No downloadable records yet.</p>
      ) : (
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
                <p className="text-[10px]" style={{ color: 'var(--color-text-faint)' }}>{r.recordType}</p>
              </div>
              <a
                href={r.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Download ${r.title}`}
                title="Download this record as a file"
                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                style={{ color: '#6DC43F' }}
              >
                <Download size={13} />
              </a>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" fullWidth variant="secondary" disabled={downloadable.length === 0} onClick={handleDownloadAll}>
        Download All Records
      </Button>
    </div>
  )
}
